import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';

const MEMORY_WINDOW     = 20;  // conversations to summarize
const MAX_MEMORY_TOKENS = 300; // max tokens in memory summary

/**
 * LeadMemoryService — persistent contextual memory for the AI agent.
 *
 * For each lead, maintains a rolling TEXT summary in `leads.ai_memory` that
 * captures: profile data, quiz answers, detected interests/objections, and
 * prior conversation highlights.
 *
 * The memory is injected into the Claude system prompt so the agent has
 * rich context across sessions — no more "who are you again?" moments.
 */
@Injectable()
export class LeadMemoryService {
  private readonly logger    = new Logger(LeadMemoryService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY', ''),
    });
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  /**
   * Build a context string to inject into the system prompt.
   * Returns the stored ai_memory (if any) + fresh lead profile snippet.
   */
  async buildContext(tenantId: string, leadId: string): Promise<string> {
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where:  { id: leadId, tenantId, deletedAt: null },
        select: {
          firstName:    true,
          lastName:     true,
          email:        true,
          phone:        true,
          company:      true,
          source:       true,
          segment:      true,
          pathology:    true,
          pipelineStage:true,
          quizAnswers:  true,
          quizScore:    true,
          behaviorScore:true,
          aiMemory:     true,
        },
      }),
    );

    if (!lead) return '';

    const parts: string[] = [];

    // Profile
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Desconocido';
    parts.push(`PERFIL DEL LEAD:
- Nombre: ${name}
- Email: ${lead.email || 'N/A'}
- Teléfono: ${lead.phone || 'N/A'}
- Empresa: ${lead.company || 'N/A'}
- Origen: ${lead.source}
- Segmento: ${lead.segment}
- Patología IA: ${lead.pathology || 'sin clasificar'}
- Etapa pipeline: ${lead.pipelineStage}
- Score quiz: ${lead.quizScore} | Score comportamiento: ${lead.behaviorScore}`);

    // Quiz answers (brief)
    const answers = lead.quizAnswers as Record<string, unknown>;
    if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) {
      const answersText = Object.entries(answers)
        .slice(0, 8)
        .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
        .join('\n');
      parts.push(`RESPUESTAS DEL QUIZ:\n${answersText}`);
    }

    // Persistent memory (running summary from prior sessions)
    if (lead.aiMemory) {
      parts.push(`MEMORIA DE CONVERSACIONES ANTERIORES:\n${lead.aiMemory}`);
    }

    return parts.join('\n\n');
  }

  /**
   * After a conversation turn, summarize the recent exchange and update
   * ai_memory — so future sessions benefit from accumulated context.
   * Runs fire-and-forget (non-blocking).
   */
  async updateMemoryAsync(tenantId: string, leadId: string): Promise<void> {
    try {
      // Fetch recent conversations
      const conversations = await this.prisma.withTenant(tenantId, () =>
        this.prisma.conversation.findMany({
          where:   { tenantId, leadId, role: { in: ['user', 'assistant'] }, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take:    MEMORY_WINDOW,
          select:  { role: true, content: true, createdAt: true },
        }),
      );

      if (conversations.length < 4) return; // not enough to summarize

      const lead = await this.prisma.withTenant(tenantId, () =>
        this.prisma.lead.findFirst({
          where:  { id: leadId, tenantId },
          select: { aiMemory: true, firstName: true, lastName: true },
        }),
      );

      if (!lead) return;

      const history = conversations
        .reverse()
        .map((c) => `${c.role === 'user' ? 'Lead' : 'Agente'}: ${c.content}`)
        .join('\n');

      const existing = lead.aiMemory ? `\nResumen previo:\n${lead.aiMemory}` : '';

      const summary = await this.anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: MAX_MEMORY_TOKENS,
        messages: [{
          role:    'user',
          content: `Eres un asistente que extrae hechos clave de conversaciones de ventas.
Resume en máximo 5 puntos breves los datos más importantes sobre este lead para que un agente de ventas recuerde en la próxima sesión.
Incluye: intereses, objeciones, compromisos, información personal relevante, y etapa de decisión.
Sé conciso. Solo hechos concretos. No uses markdown.
${existing}

CONVERSACIÓN RECIENTE:
${history}

RESUMEN ACTUALIZADO (máximo 5 puntos, una línea cada uno):`,
        }],
      });

      const block = summary.content[0];
      if (block.type !== 'text') return;

      await this.prisma.withTenant(tenantId, () =>
        this.prisma.lead.update({
          where: { id: leadId },
          data:  { aiMemory: block.text.trim() },
        }),
      );

      this.logger.debug(`AI memory updated for lead ${leadId}`);
    } catch (err: any) {
      this.logger.warn(`Memory update failed for lead ${leadId}: ${err.message}`);
    }
  }
}
