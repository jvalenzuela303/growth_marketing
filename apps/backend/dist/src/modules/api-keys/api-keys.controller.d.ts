import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CurrentUserPayload } from '../../common/decorators/tenant.decorator';
export declare class ApiKeysController {
    private readonly service;
    constructor(service: ApiKeysService);
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
    create(tenantId: string, user: CurrentUserPayload, dto: CreateApiKeyDto): Promise<{
        id: string;
        name: string;
        key: string;
        prefix: string;
        scopes: string[];
        createdAt: Date;
    }>;
    revoke(tenantId: string, id: string): Promise<{
        revoked: boolean;
        id: string;
    }>;
}
