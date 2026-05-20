"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LeadMemoryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadMemoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const sdk_1 = require("@anthropic-ai/sdk");
const config_1 = require("@nestjs/config");
const MEMORY_WINDOW = 20;
const MAX_MEMORY_TOKENS = 300;
let LeadMemoryService = LeadMemoryService_1 = class LeadMemoryService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(LeadMemoryService_1.name);
        this.anthropic = new sdk_1.default({
            apiKey: this.config.get('ANTHROPIC_API_KEY', ''),
        });
    }
    async buildContext(tenantId, leadId) {
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
            where: { id: leadId, tenantId, deletedAt: null },
            select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                company: true,
                source: true,
                segment: true,
                pathology: true,
                pipelineStage: true,
                quizAnswers: true,
                quizScore: true,
                behaviorScore: true,
                aiMemory: true,
            },
        }));
        if (!lead)
            return '';
        const parts = [];
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
        const answers = lead.quizAnswers;
        if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) {
            const answersText = Object.entries(answers)
                .slice(0, 8)
                .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
                .join('\n');
            parts.push(`RESPUESTAS DEL QUIZ:\n${answersText}`);
        }
        if (lead.aiMemory) {
            parts.push(`MEMORIA DE CONVERSACIONES ANTERIORES:\n${lead.aiMemory}`);
        }
        return parts.join('\n\n');
    }
    async updateMemoryAsync(tenantId, leadId) {
        try {
            const conversations = await this.prisma.withTenant(tenantId, () => this.prisma.conversation.findMany({
                where: { tenantId, leadId, role: { in: ['user', 'assistant'] }, deletedAt: null },
                orderBy: { createdAt: 'desc' },
                take: MEMORY_WINDOW,
                select: { role: true, content: true, createdAt: true },
            }));
            if (conversations.length < 4)
                return;
            const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
                where: { id: leadId, tenantId },
                select: { aiMemory: true, firstName: true, lastName: true },
            }));
            if (!lead)
                return;
            const history = conversations
                .reverse()
                .map((c) => `${c.role === 'user' ? 'Lead' : 'Agente'}: ${c.content}`)
                .join('\n');
            const existing = lead.aiMemory ? `\nResumen previo:\n${lead.aiMemory}` : '';
            const summary = await this.anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: MAX_MEMORY_TOKENS,
                messages: [{
                        role: 'user',
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
            if (block.type !== 'text')
                return;
            await this.prisma.withTenant(tenantId, () => this.prisma.lead.update({
                where: { id: leadId },
                data: { aiMemory: block.text.trim() },
            }));
            this.logger.debug(`AI memory updated for lead ${leadId}`);
        }
        catch (err) {
            this.logger.warn(`Memory update failed for lead ${leadId}: ${err.message}`);
        }
    }
};
exports.LeadMemoryService = LeadMemoryService;
exports.LeadMemoryService = LeadMemoryService = LeadMemoryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], LeadMemoryService);
//# sourceMappingURL=lead-memory.service.js.map