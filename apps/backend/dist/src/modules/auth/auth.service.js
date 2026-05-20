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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma_service_1 = require("../../database/prisma.service");
const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto) {
        const existingTenant = await this.prisma.tenant.findUnique({
            where: { slug: dto.tenantSlug },
        });
        if (existingTenant) {
            throw new common_1.ConflictException(`El slug "${dto.tenantSlug}" ya está en uso.`);
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('El email ya está registrado.');
        }
        const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const { tenant, user } = await this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    slug: dto.tenantSlug,
                    name: dto.tenantName,
                    plan: 'starter',
                    timezone: dto.timezone || 'America/Santiago',
                },
            });
            const user = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    email: dto.email,
                    name: dto.name,
                    passwordHash,
                    role: 'owner',
                },
            });
            return { tenant, user };
        });
        this.logger.log(`Nuevo tenant registrado: ${tenant.slug} (${tenant.id})`);
        const tokens = await this.generateTokens(user.id, tenant.id, user.role, tenant.plan);
        return { ...tokens, userId: user.id, tenantId: tenant.id };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { tenant: { select: { id: true, slug: true, name: true, plan: true, isActive: true } } },
        });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Credenciales inválidas.');
        }
        if (!user.tenant.isActive) {
            throw new common_1.UnauthorizedException('La cuenta está suspendida. Contacta a soporte.');
        }
        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Credenciales inválidas.');
        }
        this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        }).catch((err) => this.logger.warn(`No se pudo actualizar lastLoginAt: ${err.message}`));
        const tokens = await this.generateTokens(user.id, user.tenantId, user.role, user.tenant.plan);
        return {
            ...tokens,
            userId: user.id,
            tenantId: user.tenantId,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.tenant.plan,
            tenantSlug: user.tenant.slug,
            tenantName: user.tenant.name,
        };
    }
    async refresh(userId, rawRefreshToken) {
        const tokenHash = this.hashToken(rawRefreshToken);
        const storedToken = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: {
                user: {
                    include: { tenant: { select: { plan: true, isActive: true } } },
                },
            },
        });
        if (!storedToken || storedToken.userId !== userId) {
            await this.revokeAllUserTokens(userId);
            throw new common_1.UnauthorizedException('Refresh token inválido. Inicia sesión nuevamente.');
        }
        if (storedToken.revokedAt || storedToken.expiresAt < new Date()) {
            await this.revokeAllUserTokens(userId);
            throw new common_1.UnauthorizedException('Refresh token expirado o revocado. Inicia sesión nuevamente.');
        }
        await this.prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { revokedAt: new Date() },
        });
        return this.generateTokens(storedToken.user.id, storedToken.user.tenantId, storedToken.user.role, storedToken.user.tenant.plan);
    }
    async logout(userId, rawRefreshToken) {
        if (rawRefreshToken) {
            const tokenHash = this.hashToken(rawRefreshToken);
            await this.prisma.refreshToken.updateMany({
                where: { tokenHash, revokedAt: null },
                data: { revokedAt: new Date() },
            });
        }
        else {
            await this.revokeAllUserTokens(userId);
        }
    }
    async generateTokens(userId, tenantId, role, plan) {
        const payload = {
            sub: userId,
            tenantId,
            role: role,
            plan: plan,
        };
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: ACCESS_TOKEN_TTL,
            secret: this.config.get('JWT_SECRET'),
        });
        const rawRefreshToken = crypto.randomBytes(64).toString('hex');
        const tokenHash = this.hashToken(rawRefreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
        await this.prisma.refreshToken.create({
            data: { userId, tokenHash, expiresAt },
        });
        return {
            accessToken,
            refreshToken: rawRefreshToken,
            expiresIn: 900,
        };
    }
    hashToken(rawToken) {
        return crypto.createHash('sha256').update(rawToken).digest('hex');
    }
    async revokeAllUserTokens(userId) {
        await this.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map