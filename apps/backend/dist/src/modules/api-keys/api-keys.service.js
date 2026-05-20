"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ApiKeysService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../database/prisma.service");
const KEY_PREFIX = 'ge_';
const KEY_BYTES = 32;
let ApiKeysService = ApiKeysService_1 = class ApiKeysService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ApiKeysService_1.name);
    }
    async findAll(tenantId) {
        return this.prisma.withTenant(tenantId, () => this.prisma.apiKey.findMany({
            where: { tenantId, revokedAt: null },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                scopes: true,
                isActive: true,
                lastUsedAt: true,
                expiresAt: true,
                createdAt: true,
            },
        }));
    }
    async create(tenantId, userId, dto) {
        const rawKey = KEY_PREFIX + (0, crypto_1.randomBytes)(KEY_BYTES).toString('hex');
        const keyHash = this.hash(rawKey);
        const keyPrefix = rawKey.slice(0, 11);
        const record = await this.prisma.withTenant(tenantId, () => this.prisma.apiKey.create({
            data: {
                tenantId,
                name: dto.name,
                keyHash,
                keyPrefix,
                scopes: dto.scopes ?? [],
                createdBy: userId,
                isActive: true,
            },
        }));
        this.logger.log(`API key creada: ${record.id} (${dto.name}) para tenant ${tenantId}`);
        return {
            id: record.id,
            name: record.name,
            key: rawKey,
            prefix: record.keyPrefix,
            scopes: record.scopes,
            createdAt: record.createdAt,
        };
    }
    async revoke(tenantId, keyId) {
        const key = await this.prisma.withTenant(tenantId, () => this.prisma.apiKey.findFirst({ where: { id: keyId, tenantId, revokedAt: null } }));
        if (!key)
            throw new common_1.NotFoundException('API key no encontrada.');
        await this.prisma.withTenant(tenantId, () => this.prisma.apiKey.update({
            where: { id: keyId },
            data: { revokedAt: new Date(), isActive: false },
        }));
        return { revoked: true, id: keyId };
    }
    async validate(rawKey) {
        const keyHash = this.hash(rawKey);
        const record = await this.prisma.apiKey.findFirst({
            where: {
                keyHash,
                revokedAt: null,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
        });
        if (!record)
            return null;
        this.prisma.apiKey
            .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
            .catch(() => { });
        return { tenantId: record.tenantId, scopes: record.scopes };
    }
    hash(raw) {
        return (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
    }
};
exports.ApiKeysService = ApiKeysService;
exports.ApiKeysService = ApiKeysService = ApiKeysService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ApiKeysService);
//# sourceMappingURL=api-keys.service.js.map