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
var ConversationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let ConversationsService = ConversationsService_1 = class ConversationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ConversationsService_1.name);
    }
    async getInbox(tenantId) {
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const rows = await this.prisma.withTenant(tenantId, () => this.prisma.$queryRaw `
        SELECT DISTINCT ON (c.lead_id)
          c.lead_id,
          l.first_name,
          l.last_name,
          l.email,
          c.channel,
          c.content,
          c.created_at AS last_message_at
        FROM conversations c
        JOIN leads l ON l.id = c.lead_id
        WHERE c.tenant_id = ${tenantId}::uuid
          AND c.deleted_at IS NULL
          AND l.deleted_at IS NULL
        ORDER BY c.lead_id, c.created_at DESC
      `);
        if (!rows.length)
            return [];
        const leadIds = rows.map((r) => r.lead_id);
        const unreadCounts = await this.prisma.withTenant(tenantId, () => this.prisma.$queryRaw `
        SELECT lead_id, COUNT(*) AS unread
        FROM conversations
        WHERE tenant_id  = ${tenantId}::uuid
          AND lead_id    = ANY(${leadIds}::uuid[])
          AND role       = 'user'
          AND created_at >= ${since24h}
          AND deleted_at IS NULL
        GROUP BY lead_id
      `);
        const unreadMap = new Map(unreadCounts.map((r) => [r.lead_id, Number(r.unread)]));
        return rows.map((r) => ({
            leadId: r.lead_id,
            firstName: r.first_name ?? undefined,
            lastName: r.last_name ?? undefined,
            email: r.email ?? undefined,
            lastChannel: r.channel,
            lastMessage: r.content,
            lastMessageAt: r.last_message_at,
            unreadCount: unreadMap.get(r.lead_id) ?? 0,
        }));
    }
    async getMessages(tenantId, leadId) {
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
            where: { id: leadId, tenantId, deletedAt: null },
            select: { id: true, firstName: true, lastName: true, email: true },
        }));
        if (!lead)
            throw new common_1.NotFoundException('Lead no encontrado.');
        const rows = await this.prisma.withTenant(tenantId, () => this.prisma.conversation.findMany({
            where: {
                leadId,
                tenantId,
                deletedAt: null,
            },
            orderBy: { createdAt: 'asc' },
        }));
        return rows.map((m) => ({
            id: m.id,
            leadId: m.leadId,
            role: m.role,
            channel: m.channel,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
        }));
    }
    async sendReply(tenantId, leadId, content, channel) {
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
            where: { id: leadId, tenantId, deletedAt: null },
            select: { id: true },
        }));
        if (!lead)
            throw new common_1.NotFoundException('Lead no encontrado.');
        const message = await this.prisma.withTenant(tenantId, () => this.prisma.conversation.create({
            data: {
                tenantId,
                leadId,
                channel: channel || 'chat',
                role: 'human_agent',
                content,
                contentType: 'text',
                status: 'sent',
            },
        }));
        this.logger.log(`Reply sent: tenant=${tenantId} lead=${leadId} channel=${channel}`);
        return message;
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = ConversationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map