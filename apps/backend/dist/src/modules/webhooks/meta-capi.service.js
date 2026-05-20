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
var MetaCapiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaCapiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../database/prisma.service");
const crypto = require("crypto");
let MetaCapiService = MetaCapiService_1 = class MetaCapiService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(MetaCapiService_1.name);
        this.graphBase = 'https://graph.facebook.com/v20.0';
    }
    async sendPurchaseEvent(payload) {
        const { tenantId, email, phone, amount, currency, eventId, sourceUrl } = payload;
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { metaCapiToken: true, metaPixelId: true, isActive: true },
        });
        if (!tenant?.isActive)
            return;
        const accessToken = tenant.metaCapiToken || this.config.get('META_CAPI_TOKEN', '');
        const pixelId = tenant.metaPixelId;
        if (!accessToken || !pixelId) {
            this.logger.debug(`CAPI skip — tenant ${tenantId} has no pixel/token configured.`);
            return;
        }
        const userData = {};
        if (email)
            userData['em'] = this.sha256(email.trim().toLowerCase());
        if (phone)
            userData['ph'] = this.sha256(phone.replace(/\D/g, ''));
        const event = {
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            event_source_url: sourceUrl,
            action_source: 'crm',
            user_data: userData,
            custom_data: {
                value: amount,
                currency: currency.toUpperCase(),
            },
        };
        try {
            const testCode = this.config.get('META_CAPI_TEST_CODE');
            const body = { data: [event] };
            if (testCode)
                body['test_event_code'] = testCode;
            const res = await fetch(`${this.graphBase}/${pixelId}/events?access_token=${accessToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) {
                this.logger.error(`CAPI Purchase error for tenant ${tenantId}: ${JSON.stringify(json)}`);
                return;
            }
            this.logger.log(`CAPI Purchase sent — tenant ${tenantId}, eventId ${eventId}, ` +
                `events_received=${json.events_received}`);
        }
        catch (err) {
            this.logger.error(`CAPI fetch failed: ${err.message}`);
        }
    }
    sha256(value) {
        return crypto.createHash('sha256').update(value).digest('hex');
    }
};
exports.MetaCapiService = MetaCapiService;
exports.MetaCapiService = MetaCapiService = MetaCapiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], MetaCapiService);
//# sourceMappingURL=meta-capi.service.js.map