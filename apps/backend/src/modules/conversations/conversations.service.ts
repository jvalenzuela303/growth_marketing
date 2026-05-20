import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the inbox: one row per leadId with last message and unread count.
   * Unread count = messages with role='user' in the last 24 hours
   * (approximation: no per-message read tracking in schema v1).
   */
  async getInbox(tenantId: string) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch all distinct leadIds that have conversations for this tenant,
    // along with the most-recent message per lead.
    const rows = await this.prisma.withTenant(tenantId, () =>
      this.prisma.$queryRaw<
        Array<{
          lead_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          channel: string;
          content: string;
          last_message_at: Date;
        }>
      >`
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
      `,
    );

    if (!rows.length) return [];

    // For each lead, count unread (role='user') messages in last 24 h
    const leadIds = rows.map((r) => r.lead_id);

    const unreadCounts = await this.prisma.withTenant(tenantId, () =>
      this.prisma.$queryRaw<Array<{ lead_id: string; unread: bigint }>>`
        SELECT lead_id, COUNT(*) AS unread
        FROM conversations
        WHERE tenant_id  = ${tenantId}::uuid
          AND lead_id    = ANY(${leadIds}::uuid[])
          AND role       = 'user'
          AND created_at >= ${since24h}
          AND deleted_at IS NULL
        GROUP BY lead_id
      `,
    );

    const unreadMap = new Map(
      unreadCounts.map((r) => [r.lead_id, Number(r.unread)]),
    );

    return rows.map((r) => ({
      leadId:        r.lead_id,
      firstName:     r.first_name ?? undefined,
      lastName:      r.last_name  ?? undefined,
      email:         r.email      ?? undefined,
      lastChannel:   r.channel,
      lastMessage:   r.content,
      lastMessageAt: r.last_message_at,
      unreadCount:   unreadMap.get(r.lead_id) ?? 0,
    }));
  }

  /**
   * Returns the full message history for a lead, verifying tenant ownership.
   */
  async getMessages(tenantId: string, leadId: string) {
    // Verify the lead belongs to this tenant
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: leadId, tenantId, deletedAt: null },
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    );

    if (!lead) throw new NotFoundException('Lead no encontrado.');

    const rows = await this.prisma.withTenant(tenantId, () =>
      this.prisma.conversation.findMany({
        where: {
          leadId,
          tenantId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      }),
    );

    return rows.map((m) => ({
      id:        m.id,
      leadId:    m.leadId,
      role:      m.role as 'user' | 'assistant' | 'human_agent',
      channel:   m.channel as 'whatsapp' | 'email' | 'chat',
      content:   m.content,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  /**
   * Creates a human_agent reply message for a given lead.
   */
  async sendReply(
    tenantId: string,
    leadId: string,
    content: string,
    channel: string,
  ) {
    // Verify the lead belongs to this tenant
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: leadId, tenantId, deletedAt: null },
        select: { id: true },
      }),
    );

    if (!lead) throw new NotFoundException('Lead no encontrado.');

    const message = await this.prisma.withTenant(tenantId, () =>
      this.prisma.conversation.create({
        data: {
          tenantId,
          leadId,
          channel: channel || 'chat',
          role: 'human_agent',
          content,
          contentType: 'text',
          status: 'sent',
        },
      }),
    );

    this.logger.log(`Reply sent: tenant=${tenantId} lead=${leadId} channel=${channel}`);
    return message;
  }
}
