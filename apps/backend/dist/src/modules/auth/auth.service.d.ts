import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthTokens } from '@growth-engine/shared-types';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly config;
    private readonly logger;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService);
    register(dto: RegisterDto): Promise<AuthTokens & {
        userId: string;
        tenantId: string;
    }>;
    login(dto: LoginDto): Promise<AuthTokens & {
        userId: string;
        tenantId: string;
        email: string;
        name: string | null;
        role: string;
        plan: string;
        tenantSlug: string;
        tenantName: string;
    }>;
    refresh(userId: string, rawRefreshToken: string): Promise<AuthTokens>;
    logout(userId: string, rawRefreshToken?: string): Promise<void>;
    private generateTokens;
    private hashToken;
    private revokeAllUserTokens;
}
