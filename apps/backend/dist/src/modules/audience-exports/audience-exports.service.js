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
var AudienceExportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudienceExportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const MIN_LEADS_FOR_EXPORT = 100;
let AudienceExportsService = AudienceExportsService_1 = class AudienceExportsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AudienceExportsService_1.name);
    }
    async findAll(tenantId) {
        return this.prisma.withTenant(tenantId, () => this.prisma.audienceExport.findMany({
            where: { tenantId },
            orderBy: { exportedAt: 'desc' },
        }));
    }
    async create(tenantId, segment, type) {
        const leadCount = await this.prisma.withTenant(tenantId, () => this.prisma.lead.count({
            where: {
                tenantId,
                segment,
                deletedAt: null,
            },
        }));
        if (leadCount < MIN_LEADS_FOR_EXPORT) {
            throw new common_1.BadRequestException(`Se necesitan al menos ${MIN_LEADS_FOR_EXPORT} leads en este segmento. Actualmente hay ${leadCount}.`);
        }
        const audienceExport = await this.prisma.withTenant(tenantId, () => this.prisma.audienceExport.create({
            data: {
                tenantId,
                segment,
                type,
                leadCount,
                status: 'pending',
            },
        }));
        const metaAudienceId = `act_${Date.now()}`;
        const completed = await this.prisma.withTenant(tenantId, () => this.prisma.audienceExport.update({
            where: { id: audienceExport.id },
            data: {
                status: 'completed',
                metaAudienceId,
            },
        }));
        this.logger.log(`Audience export created: ${completed.id} | segment=${segment} | type=${type} | leads=${leadCount} | tenant=${tenantId}`);
        return completed;
    }
};
exports.AudienceExportsService = AudienceExportsService;
exports.AudienceExportsService = AudienceExportsService = AudienceExportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AudienceExportsService);
//# sourceMappingURL=audience-exports.service.js.map