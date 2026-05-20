import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { LeadMemoryService } from './lead-memory.service';
import Anthropic from '@anthropic-ai/sdk';
import type { Response } from 'express';

const FALLBACK_RESPONSE    = 'Gracias por tu mensaje. Un asesor se comunicará contigo pronto.';
const AI_ENGINE_TIMEOUT_MS = 10_000;
const HISTORY_WINDOW       = 10; // last N messages to pass as context

const BASE_SYSTEM_PROMPT = `Eres un asistente de ventas experto que usa The Growth Engine como CRM.
Tu función es ayudar a calificar leads, responder preguntas sobre el producto o servicio,
y guiar al prospecto hacia una reunión o cierre.
Sé conciso, empático y orientado a resultados. Responde siempre en español.
No inventes información que no tengas. Si no sabes algo, di que lo consultarás con el equipo.
Usa la información del perfil del lead para personalizar cada respuesta.`;

@Injectable()
export class ChatService {
  private readonly logger    = new Logger(ChatService.name);
  private readonly anthropic: Anthropic;

  constructor(
    private readonly prisma:  PrismaService,
    private readonly config:  ConfigService,
    private readonly memory:  LeadMemoryService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY', ''),
    });
  }

  // ── Synchronous (existing) ─────────────────────────────────────────────────

  async sendMessage(
    tenantId: string,
    leadId:   string,
    message:  string,
    channel:  string,
  ): Promise<{ messageId: string; response: string; leadId: string }> {
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where:  { id: leadId, tenantId, deletedAt: null },
        select: { id: true },
      }),
    );
    if (!lead) throw new NotFoundException('Lead no encontrado o no pertenece a este tenant.');

    await this.prisma.withTenant(tenantId, () =>
      this.prisma.conversation.create({
        data: { tenantId, leadId, channel, role: 'user', content: message },
      }),
    );

    // Build enriched system prompt with lead memory context
    const leadContext  = await this.memory.buildContext(tenantId, leadId);
    const systemPrompt = leadContext
      ? `${BASE_SYSTEM_PROMPT}\n\n${leadContext}`
      : BASE_SYSTEM_PROMPT;

    // Intentar AI Engine primero; si falla, usar Claude directamente
    let aiResponse = FALLBACK_RESPONSE;

    try {
      const aiEngineUrl  = this.config.get<string>('AI_ENGINE_URL', 'http://localhost:8000');
      const controller   = new AbortController();
      const timeoutId    = setTimeout(() => controller.abort(), AI_ENGINE_TIMEOUT_MS);
      const res          = await fetch(`${aiEngineUrl}/api/v1/chat/message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ lead_id: leadId, tenant_id: tenantId, message, channel, context: leadContext }),
        signal:  controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json() as { response?: string };
        if (data.response) aiResponse = data.response;
      }
    } catch {
      // AI Engine unavailable — fall through to Claude direct
      try {
        const history = await this.getHistory(tenantId, leadId);
        const response = await this.anthropic.messages.create({
          model:      'claude-sonnet-4-6',
          max_tokens: 512,
          system:     systemPrompt,
          messages:   [...history, { role: 'user', content: message }],
        });
        const block = response.content[0];
        if (block.type === 'text') aiResponse = block.text;
      } catch (err: any) {
        this.logger.warn(`Claude directo fallido: ${err.message}`);
      }
    }

    const saved = await this.prisma.withTenant(tenantId, () =>
      this.prisma.conversation.create({
        data: { tenantId, leadId, channel, role: 'assistant', content: aiResponse, aiModel: 'claude-sonnet-4-6' },
      }),
    );

    // Fire-and-forget: update lead AI memory summary
    this.memory.updateMemoryAsync(tenantId, leadId).catch(() => {});

    return { messageId: saved.id, response: aiResponse, leadId };
  }

  // ── SSE streaming ──────────────────────────────────────────────────────────

  /**
   * Streams Claude response via Server-Sent Events.
   * Writes SSE events directly to the Response object:
   *   data: {"token":"Hello"}\n\n
   *   data: [DONE]\n\n
   */
  async streamMessage(
    tenantId: string,
    leadId:   string,
    message:  string,
    res:      Response,
    model?:   string,
  ): Promise<void> {
    const selectedModel = model || 'claude-sonnet-4-6';
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where:  { id: leadId, tenantId, deletedAt: null },
        select: { id: true },
      }),
    );
    if (!lead) {
      res.write(`data: ${JSON.stringify({ error: 'Lead no encontrado' })}\n\n`);
      res.end();
      return;
    }

    // Persist user message
    await this.prisma.withTenant(tenantId, () =>
      this.prisma.conversation.create({
        data: { tenantId, leadId, channel: 'chat', role: 'user', content: message },
      }),
    );

    // Set SSE headers
    res.setHeader('Content-Type',  'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering

    let fullResponse = '';

    // Build enriched system prompt with lead context
    const leadContext     = await this.memory.buildContext(tenantId, leadId);
    const streamSysPrompt = leadContext
      ? `${BASE_SYSTEM_PROMPT}\n\n${leadContext}`
      : BASE_SYSTEM_PROMPT;

    const history = await this.getHistory(tenantId, leadId);

    try {
      if (selectedModel.startsWith('gpt-')) {
        fullResponse = await this.streamOpenAI(selectedModel, streamSysPrompt, history, message, res);
      } else if (selectedModel.startsWith('gemini-')) {
        fullResponse = await this.streamGemini(selectedModel, streamSysPrompt, history, message, res);
      } else {
        // Default: Anthropic Claude
        const stream = this.anthropic.messages.stream({
          model:      selectedModel,
          max_tokens: 1024,
          system:     streamSysPrompt,
          messages:   [...history, { role: 'user', content: message }],
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            (event.delta as any).type === 'text_delta'
          ) {
            const token = (event.delta as any).text as string;
            fullResponse += token;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`SSE streaming error (${selectedModel}): ${err.message}`);
      fullResponse = FALLBACK_RESPONSE;
      res.write(`data: ${JSON.stringify({ token: FALLBACK_RESPONSE })}\n\n`);
    }

    // Signal completion
    res.write('data: [DONE]\n\n');

    // Persist assistant response
    await this.prisma.withTenant(tenantId, () =>
      this.prisma.conversation.create({
        data: {
          tenantId,
          leadId,
          channel:  'chat',
          role:     'assistant',
          content:  fullResponse || FALLBACK_RESPONSE,
          aiModel:  'claude-sonnet-4-6',
        },
      }),
    );

    // Fire-and-forget: update lead AI memory summary
    this.memory.updateMemoryAsync(tenantId, leadId).catch(() => {});

    res.end();
  }

  // ── Provider: OpenAI streaming ────────────────────────────────────────────

  private async streamOpenAI(
    model:   string,
    system:  string,
    history: { role: 'user' | 'assistant'; content: string }[],
    message: string,
    res:     Response,
  ): Promise<string> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    if (!apiKey) {
      res.write(`data: ${JSON.stringify({ token: '(OpenAI no configurado — falta OPENAI_API_KEY)' })}\n\n`);
      return '(OpenAI no configurado)';
    }

    const messages = [
      { role: 'system', content: system },
      ...history,
      { role: 'user', content: message },
    ];

    const httpRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body:    JSON.stringify({ model, messages, stream: true, max_tokens: 1024 }),
    });

    if (!httpRes.ok || !httpRes.body) {
      throw new Error(`OpenAI HTTP ${httpRes.status}`);
    }

    let full   = '';
    const reader  = httpRes.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;
        try {
          const json  = JSON.parse(payload);
          const token = json?.choices?.[0]?.delta?.content as string | undefined;
          if (token) {
            full += token;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch { /* skip */ }
      }
    }

    return full;
  }

  // ── Provider: Gemini streaming ────────────────────────────────────────────

  private async streamGemini(
    model:   string,
    system:  string,
    history: { role: 'user' | 'assistant'; content: string }[],
    message: string,
    res:     Response,
  ): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY', '');
    if (!apiKey) {
      res.write(`data: ${JSON.stringify({ token: '(Gemini no configurado — falta GEMINI_API_KEY)' })}\n\n`);
      return '(Gemini no configurado)';
    }

    // Gemini uses { role: 'user'|'model', parts: [{text}] }
    const geminiHistory = history.map((h) => ({
      role:  h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));
    const contents = [
      ...geminiHistory,
      { role: 'user', parts: [{ text: message }] },
    ];

    const httpRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      },
    );

    if (!httpRes.ok || !httpRes.body) {
      throw new Error(`Gemini HTTP ${httpRes.status}`);
    }

    let full   = '';
    const reader  = httpRes.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Gemini returns newline-delimited JSON objects
      const objects = buffer.split('\n\n');
      buffer = objects.pop() ?? '';

      for (const chunk of objects) {
        const trimmed = chunk.replace(/^data:\s*/, '').trim();
        if (!trimmed || trimmed === '[DONE]') continue;
        try {
          const json  = JSON.parse(trimmed);
          const token = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
          if (token) {
            full += token;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch { /* skip */ }
      }
    }

    return full;
  }

  // ── Helper: last N messages as Claude history ─────────────────────────────

  private async getHistory(
    tenantId: string,
    leadId:   string,
  ): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
    const rows = await this.prisma.withTenant(tenantId, () =>
      this.prisma.conversation.findMany({
        where:   { tenantId, leadId, role: { in: ['user', 'assistant'] }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take:    HISTORY_WINDOW,
        select:  { role: true, content: true },
      }),
    );
    return rows
      .reverse()
      .map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }));
  }
}
