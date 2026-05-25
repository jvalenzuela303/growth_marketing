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
var ChatService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../database/prisma.service");
const lead_memory_service_1 = require("./lead-memory.service");
const sdk_1 = require("@anthropic-ai/sdk");
const FALLBACK_RESPONSE = 'Gracias por tu mensaje. Un asesor se comunicará contigo pronto.';
const AI_ENGINE_TIMEOUT_MS = 10_000;
const HISTORY_WINDOW = 10;
const BASE_SYSTEM_PROMPT = `Eres un asistente de ventas experto que usa The Growth Engine como CRM.
Tu función es ayudar a calificar leads, responder preguntas sobre el producto o servicio,
y guiar al prospecto hacia una reunión o cierre.
Sé conciso, empático y orientado a resultados. Responde siempre en español.
No inventes información que no tengas. Si no sabes algo, di que lo consultarás con el equipo.
Usa la información del perfil del lead para personalizar cada respuesta.`;
let ChatService = ChatService_1 = class ChatService {
    constructor(prisma, config, memory) {
        this.prisma = prisma;
        this.config = config;
        this.memory = memory;
        this.logger = new common_1.Logger(ChatService_1.name);
        this.anthropic = new sdk_1.default({
            apiKey: this.config.get('ANTHROPIC_API_KEY', ''),
        });
    }
    async sendMessage(tenantId, leadId, message, channel) {
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
            where: { id: leadId, tenantId, deletedAt: null },
            select: { id: true },
        }));
        if (!lead)
            throw new common_1.NotFoundException('Lead no encontrado o no pertenece a este tenant.');
        await this.prisma.withTenant(tenantId, () => this.prisma.conversation.create({
            data: { tenantId, leadId, channel, role: 'user', content: message },
        }));
        const leadContext = await this.memory.buildContext(tenantId, leadId);
        const systemPrompt = leadContext
            ? `${BASE_SYSTEM_PROMPT}\n\n${leadContext}`
            : BASE_SYSTEM_PROMPT;
        let aiResponse = FALLBACK_RESPONSE;
        try {
            const aiEngineUrl = this.config.get('AI_ENGINE_URL', 'http://localhost:8000');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), AI_ENGINE_TIMEOUT_MS);
            const res = await fetch(`${aiEngineUrl}/api/v1/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead_id: leadId, tenant_id: tenantId, message, channel, context: leadContext }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                if (data.response)
                    aiResponse = data.response;
            }
        }
        catch {
            try {
                const history = await this.getHistory(tenantId, leadId);
                const response = await this.anthropic.messages.create({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 512,
                    system: systemPrompt,
                    messages: [...history, { role: 'user', content: message }],
                });
                const block = response.content[0];
                if (block.type === 'text')
                    aiResponse = block.text;
            }
            catch (err) {
                this.logger.warn(`Claude directo fallido: ${err.message}`);
            }
        }
        const saved = await this.prisma.withTenant(tenantId, () => this.prisma.conversation.create({
            data: { tenantId, leadId, channel, role: 'assistant', content: aiResponse, aiModel: 'claude-sonnet-4-6' },
        }));
        this.memory.updateMemoryAsync(tenantId, leadId).catch(() => { });
        return { messageId: saved.id, response: aiResponse, leadId };
    }
    async respondPublic(tenantId, tenantName, message, leadId, clientHistory) {
        if (leadId) {
            const result = await this.sendMessage(tenantId, leadId, message, 'chat');
            return result.response;
        }
        const publicPrompt = `Eres el asistente de admisiones de ${tenantName}.
Responde dudas sobre programas, requisitos, fechas de inscripción, costos y modalidades.
Sé amable, claro y orientado a guiar al visitante a inscribirse o agendar una cita.
Responde siempre en español. Si no sabes algo específico, ofrece conectar con un asesor humano.`;
        const history = clientHistory ?? [];
        try {
            const response = await this.anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 512,
                system: publicPrompt,
                messages: [...history, { role: 'user', content: message }],
            });
            const block = response.content[0];
            return block.type === 'text' ? block.text : FALLBACK_RESPONSE;
        }
        catch (err) {
            this.logger.warn(`Widget public chat error: ${err.message}`);
            return FALLBACK_RESPONSE;
        }
    }
    async streamMessage(tenantId, leadId, message, res, model) {
        const selectedModel = model || 'claude-sonnet-4-6';
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
            where: { id: leadId, tenantId, deletedAt: null },
            select: { id: true },
        }));
        if (!lead) {
            res.write(`data: ${JSON.stringify({ error: 'Lead no encontrado' })}\n\n`);
            res.end();
            return;
        }
        await this.prisma.withTenant(tenantId, () => this.prisma.conversation.create({
            data: { tenantId, leadId, channel: 'chat', role: 'user', content: message },
        }));
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        let fullResponse = '';
        const leadContext = await this.memory.buildContext(tenantId, leadId);
        const streamSysPrompt = leadContext
            ? `${BASE_SYSTEM_PROMPT}\n\n${leadContext}`
            : BASE_SYSTEM_PROMPT;
        const history = await this.getHistory(tenantId, leadId);
        try {
            if (selectedModel.startsWith('gpt-')) {
                fullResponse = await this.streamOpenAI(selectedModel, streamSysPrompt, history, message, res);
            }
            else if (selectedModel.startsWith('gemini-')) {
                fullResponse = await this.streamGemini(selectedModel, streamSysPrompt, history, message, res);
            }
            else {
                const stream = this.anthropic.messages.stream({
                    model: selectedModel,
                    max_tokens: 1024,
                    system: streamSysPrompt,
                    messages: [...history, { role: 'user', content: message }],
                });
                for await (const event of stream) {
                    if (event.type === 'content_block_delta' &&
                        event.delta.type === 'text_delta') {
                        const token = event.delta.text;
                        fullResponse += token;
                        res.write(`data: ${JSON.stringify({ token })}\n\n`);
                    }
                }
            }
        }
        catch (err) {
            this.logger.error(`SSE streaming error (${selectedModel}): ${err.message}`);
            fullResponse = FALLBACK_RESPONSE;
            res.write(`data: ${JSON.stringify({ token: FALLBACK_RESPONSE })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        await this.prisma.withTenant(tenantId, () => this.prisma.conversation.create({
            data: {
                tenantId,
                leadId,
                channel: 'chat',
                role: 'assistant',
                content: fullResponse || FALLBACK_RESPONSE,
                aiModel: 'claude-sonnet-4-6',
            },
        }));
        this.memory.updateMemoryAsync(tenantId, leadId).catch(() => { });
        res.end();
    }
    async streamOpenAI(model, system, history, message, res) {
        const apiKey = this.config.get('OPENAI_API_KEY', '');
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
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, messages, stream: true, max_tokens: 1024 }),
        });
        if (!httpRes.ok || !httpRes.body) {
            throw new Error(`OpenAI HTTP ${httpRes.status}`);
        }
        let full = '';
        const reader = httpRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                if (!line.startsWith('data: '))
                    continue;
                const payload = line.slice(6).trim();
                if (payload === '[DONE]')
                    break;
                try {
                    const json = JSON.parse(payload);
                    const token = json?.choices?.[0]?.delta?.content;
                    if (token) {
                        full += token;
                        res.write(`data: ${JSON.stringify({ token })}\n\n`);
                    }
                }
                catch { }
            }
        }
        return full;
    }
    async streamGemini(model, system, history, message, res) {
        const apiKey = this.config.get('GEMINI_API_KEY', '');
        if (!apiKey) {
            res.write(`data: ${JSON.stringify({ token: '(Gemini no configurado — falta GEMINI_API_KEY)' })}\n\n`);
            return '(Gemini no configurado)';
        }
        const geminiHistory = history.map((h) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
        }));
        const contents = [
            ...geminiHistory,
            { role: 'user', parts: [{ text: message }] },
        ];
        const httpRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: system }] },
                contents,
                generationConfig: { maxOutputTokens: 1024 },
            }),
        });
        if (!httpRes.ok || !httpRes.body) {
            throw new Error(`Gemini HTTP ${httpRes.status}`);
        }
        let full = '';
        const reader = httpRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const objects = buffer.split('\n\n');
            buffer = objects.pop() ?? '';
            for (const chunk of objects) {
                const trimmed = chunk.replace(/^data:\s*/, '').trim();
                if (!trimmed || trimmed === '[DONE]')
                    continue;
                try {
                    const json = JSON.parse(trimmed);
                    const token = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (token) {
                        full += token;
                        res.write(`data: ${JSON.stringify({ token })}\n\n`);
                    }
                }
                catch { }
            }
        }
        return full;
    }
    async getHistory(tenantId, leadId) {
        const rows = await this.prisma.withTenant(tenantId, () => this.prisma.conversation.findMany({
            where: { tenantId, leadId, role: { in: ['user', 'assistant'] }, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: HISTORY_WINDOW,
            select: { role: true, content: true },
        }));
        return rows
            .reverse()
            .map((r) => ({ role: r.role, content: r.content }));
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = ChatService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        lead_memory_service_1.LeadMemoryService])
], ChatService);
//# sourceMappingURL=chat.service.js.map