import { PrismaService } from '../../database/prisma.service';
export declare class ConversationsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getInbox(tenantId: string): Promise<{
        leadId: string;
        firstName: string;
        lastName: string;
        email: string;
        lastChannel: string;
        lastMessage: string;
        lastMessageAt: Date;
        unreadCount: number;
    }[]>;
    getMessages(tenantId: string, leadId: string): Promise<{
        id: string;
        leadId: string;
        role: "user" | "assistant" | "human_agent";
        channel: "whatsapp" | "email" | "chat";
        content: string;
        createdAt: string;
    }[]>;
    sendReply(tenantId: string, leadId: string, content: string, channel: string): Promise<{
        id: string;
        createdAt: Date;
        tenantId: string;
        role: string;
        deletedAt: Date | null;
        leadId: string;
        channel: string;
        content: string;
        contentType: string;
        metadata: import("@prisma/client/runtime/library").JsonValue;
        status: string;
        externalMessageId: string | null;
        aiModel: string | null;
        aiTokensUsed: number | null;
        aiLatencyMs: number | null;
    }>;
}
