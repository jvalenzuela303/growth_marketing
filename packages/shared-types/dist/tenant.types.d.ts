export type TenantPlan = 'starter' | 'growth' | 'scale' | 'agency';
export interface Tenant {
    id: string;
    slug: string;
    name: string;
    plan: TenantPlan;
    isActive: boolean;
    createdAt: Date;
}
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export interface User {
    id: string;
    tenantId: string;
    email: string;
    name?: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface JwtPayload {
    sub: string;
    tenantId: string;
    role: UserRole;
    plan: TenantPlan;
    iat: number;
    exp: number;
}
//# sourceMappingURL=tenant.types.d.ts.map