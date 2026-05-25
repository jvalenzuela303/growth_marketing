import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { TransbankService } from './transbank.service';
export declare const PLAN_LIMITS: Record<string, {
    maxFunnels: number;
    maxLeadsPerMonth: number;
    maxWhatsappMessages: number;
}>;
export declare class BillingService {
    private readonly config;
    private readonly prisma;
    private readonly transbank;
    private readonly logger;
    private readonly stripe;
    constructor(config: ConfigService, prisma: PrismaService, transbank: TransbankService);
    private priceId;
    createCheckoutSession(tenantId: string, plan: 'growth' | 'scale' | 'agency'): Promise<{
        url: string;
    }>;
    createPortalSession(tenantId: string): Promise<{
        url: string;
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
            stripeCustomerId: string | null;
            stripeSubId: string | null;
            stripePriceId: string | null;
            currentPeriodStart: Date | null;
            currentPeriodEnd: Date | null;
            cancelAtPeriodEnd: boolean;
            trialEnd: Date | null;
            paymentMethodMock: import("@prisma/client/runtime/library").JsonValue | null;
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
    getPaymentMethods(tenantId: string): Promise<{
        id: string;
        last4: string;
        brand: string;
        cardType: string;
        isDefault: boolean;
    }[]>;
    startEnrollment(tenantId: string, returnUrl: string): Promise<import("./transbank.service").EnrollmentStartResult>;
    confirmEnrollment(tenantId: string, sessionToken: string): Promise<{
        id: string;
        last4: string;
        brand: string;
        cardType: string;
        isDefault: boolean;
    }>;
    detachPaymentMethod(tenantId: string, _cardId: string): Promise<{
        success: boolean;
    }>;
    handleWebhook(rawBody: Buffer, signature: string): Promise<void>;
    private onCheckoutCompleted;
    private onSubscriptionUpdated;
    private onSubscriptionDeleted;
    private onInvoicePaid;
    private onInvoicePaymentFailed;
    private stripe_call;
    private upsertSubscriptionAndUpdatePlan;
    private upsertInvoice;
    private findTenantByCustomer;
}
