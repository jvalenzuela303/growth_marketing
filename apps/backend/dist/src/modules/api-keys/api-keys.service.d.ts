import { PrismaService } from '../../database/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
export declare class ApiKeysService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(tenantId: string): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        expiresAt: Date;
        keyPrefix: string;
        scopes: string[];
        lastUsedAt: Date;
    }[]>;
    create(tenantId: string, userId: string, dto: CreateApiKeyDto): Promise<{
        id: string;
        name: string;
        key: string;
        prefix: string;
        scopes: string[];
        createdAt: Date;
    }>;
    revoke(tenantId: string, keyId: string): Promise<{
        revoked: boolean;
        id: string;
    }>;
    validate(rawKey: string): Promise<{
        tenantId: string;
        scopes: string[];
    } | null>;
    private hash;
}
