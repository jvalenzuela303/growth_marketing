import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
declare class CreateCheckoutDto {
    plan: 'growth' | 'scale' | 'agency';
}
declare class StartEnrollmentDto {
    returnUrl: string;
}
declare class ConfirmEnrollmentDto {
    sessionToken: string;
}
export declare class BillingController {
    private readonly billingService;
    constructor(billingService: BillingService);
    createCheckout(tenantId: string, dto: CreateCheckoutDto): Promise<{
        url: string;
    }>;
    createPortal(tenantId: string): Promise<{
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
    startEnrollment(tenantId: string, dto: StartEnrollmentDto): Promise<import("./transbank.service").EnrollmentStartResult>;
    confirmEnrollment(tenantId: string, dto: ConfirmEnrollmentDto): Promise<{
        id: string;
        last4: string;
        brand: string;
        cardType: string;
        isDefault: boolean;
    }>;
    detachPaymentMethod(tenantId: string, cardId: string): Promise<{
        success: boolean;
    }>;
    handleWebhook(req: RawBodyRequest<Request>, sig: string): Promise<void>;
}
export {};
