import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
export declare const PLAN_LIMITS: Record<string, {
    maxFunnels: number;
    maxLeadsPerMonth: number;
    maxWhatsappMessages: number;
}>;
export declare class BillingService {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    private readonly stripe;
    constructor(config: ConfigService, prisma: PrismaService);
    private priceId;
    createCheckoutSession(tenantId: string, plan: 'growth' | 'scale' | 'agency'): Promise<{
        url: any;
    }>;
    createPortalSession(tenantId: string): Promise<{
        url: any;
    }>;
    getSubscription(tenantId: string): Promise<{
        plan: string;
        status: string;
        limits: {
            maxFunnels: number;
            maxLeadsPerMonth: number;
            maxWhatsappMessages: number;
        };
        sub: {
            id: string;
            plan: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            status: string;
            stripeCustomerId: string;
            stripeSubId: string | null;
            stripePriceId: string | null;
            currentPeriodStart: Date | null;
            currentPeriodEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            trialEnd: Date | null;
        };
    }>;
    getInvoices(tenantId: string): Promise<{
        id: string;
        currency: string;
        createdAt: Date;
        tenantId: string;
        status: string;
        periodStart: Date | null;
        periodEnd: Date | null;
        subscriptionId: string | null;
        stripeInvoiceId: string;
        stripeCustomerId: string;
        amountDue: import("@prisma/client/runtime/library").Decimal;
        amountPaid: import("@prisma/client/runtime/library").Decimal;
        hostedInvoiceUrl: string | null;
        invoicePdfUrl: string | null;
    }[]>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<void>;
    private onCheckoutCompleted;
    private onSubscriptionUpdated;
    private onSubscriptionDeleted;
    private onInvoicePaid;
    private onInvoicePaymentFailed;
    private upsertSubscriptionAndUpdatePlan;
    private upsertInvoice;
    private findTenantByCustomer;
}
