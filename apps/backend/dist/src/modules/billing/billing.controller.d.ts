import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
declare class CreateCheckoutDto {
    plan: 'growth' | 'scale' | 'agency';
}
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    createCheckout(tenantId: string, dto: CreateCheckoutDto): Promise<{
        url: any;
    }>;
    createPortal(tenantId: string): Promise<{
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
    handleWebhook(req: RawBodyRequest<Request>, sig: string): Promise<void>;
}
export {};
