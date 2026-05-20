import type { UserRole, TenantPlan } from '@growth-engine/shared-types';
export declare const TenantId: (...dataOrPipes: unknown[]) => ParameterDecorator;
export interface CurrentUserPayload {
    id: string;
    role: UserRole;
    plan: TenantPlan;
    tenantId: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
