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
var SettingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
function maskSecret(value) {
    if (value == null || value.length === 0)
        return null;
    if (value.length <= 4)
        return '***...';
    return '***...' + value.slice(-4);
}
let SettingsService = SettingsService_1 = class SettingsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SettingsService_1.name);
    }
    async getSettings(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                metaPixelId: true,
                metaCapiToken: true,
                metaWhatsappPhoneId: true,
                metaWhatsappToken: true,
                metaInstagramPageId: true,
                metaInstagramAccessToken: true,
                sendgridApiKey: true,
                ghlApiKey: true,
                ghlLocationId: true,
                hubspotApiKey: true,
                alertEmail: true,
                hotLeadAlertEnabled: true,
                dailyDigestEnabled: true,
                adAccountId: true,
                googleCalendarRefreshToken: true,
                calendlyApiKey: true,
            },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado.');
        return {
            id: tenant.id,
            metaPixelId: tenant.metaPixelId ?? null,
            metaCapiToken: maskSecret(tenant.metaCapiToken),
            metaWhatsappPhoneId: tenant.metaWhatsappPhoneId ?? null,
            metaWhatsappToken: maskSecret(tenant.metaWhatsappToken),
            instagramConnected: !!tenant.metaInstagramAccessToken,
            instagramPageId: tenant.metaInstagramPageId ?? null,
            sendgridApiKey: maskSecret(tenant.sendgridApiKey),
            ghlApiKey: maskSecret(tenant.ghlApiKey),
            ghlLocationId: tenant.ghlLocationId ?? null,
            hubspotApiKey: maskSecret(tenant.hubspotApiKey),
            alertEmail: tenant.alertEmail ?? null,
            hotLeadAlertEnabled: tenant.hotLeadAlertEnabled ?? false,
            dailyDigestEnabled: tenant.dailyDigestEnabled ?? false,
            adAccountId: tenant.adAccountId ?? null,
            googleCalendarConnected: !!tenant.googleCalendarRefreshToken,
            calendlyApiKey: maskSecret(tenant.calendlyApiKey),
        };
    }
    async updateSettings(tenantId, dto) {
        this.logger.log(`Actualizando settings para tenant ${tenantId}`);
        const data = {};
        if (dto.metaPixelId !== undefined)
            data.metaPixelId = dto.metaPixelId;
        if (dto.metaCapiToken !== undefined)
            data.metaCapiToken = dto.metaCapiToken;
        if (dto.metaWhatsappPhoneId !== undefined)
            data.metaWhatsappPhoneId = dto.metaWhatsappPhoneId;
        if (dto.metaWhatsappToken !== undefined)
            data.metaWhatsappToken = dto.metaWhatsappToken;
        if (dto.sendgridApiKey !== undefined)
            data.sendgridApiKey = dto.sendgridApiKey;
        if (dto.ghlApiKey !== undefined)
            data.ghlApiKey = dto.ghlApiKey;
        if (dto.ghlLocationId !== undefined)
            data.ghlLocationId = dto.ghlLocationId;
        if (dto.hubspotApiKey !== undefined)
            data.hubspotApiKey = dto.hubspotApiKey;
        if (dto.alertEmail !== undefined)
            data.alertEmail = dto.alertEmail;
        if (dto.hotLeadAlertEnabled !== undefined)
            data.hotLeadAlertEnabled = dto.hotLeadAlertEnabled;
        if (dto.dailyDigestEnabled !== undefined)
            data.dailyDigestEnabled = dto.dailyDigestEnabled;
        if (dto.adAccountId !== undefined)
            data.adAccountId = dto.adAccountId;
        if (dto.calendlyApiKey !== undefined)
            data.calendlyApiKey = dto.calendlyApiKey;
        if (Object.keys(data).length === 0) {
            return this.getSettings(tenantId);
        }
        await this.prisma.tenant.update({ where: { id: tenantId }, data });
        this.logger.log(`Settings actualizados para tenant ${tenantId}`);
        return this.getSettings(tenantId);
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = SettingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map