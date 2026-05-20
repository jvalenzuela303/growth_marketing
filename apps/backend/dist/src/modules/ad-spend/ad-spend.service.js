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
var AdSpendService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdSpendService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let AdSpendService = AdSpendService_1 = class AdSpendService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AdSpendService_1.name);
    }
    async findAll(tenantId, page, limit) {
        const skip = (page - 1) * limit;
        const [data, total] = await this.prisma.withTenant(tenantId, () => Promise.all([
            this.prisma.adSpend.findMany({
                where: { tenantId },
                orderBy: { periodStart: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.adSpend.count({ where: { tenantId } }),
        ]));
        return {
            data,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async create(tenantId, dto) {
        const record = await this.prisma.withTenant(tenantId, () => this.prisma.adSpend.create({
            data: {
                tenantId,
                source: dto.source,
                spendAmount: dto.spendAmount,
                currency: dto.currency ?? 'CLP',
                periodStart: new Date(dto.periodStart),
                periodEnd: new Date(dto.periodEnd),
                ...(dto.campaignName && { campaignName: dto.campaignName }),
                ...(dto.funnelId && { funnelId: dto.funnelId }),
            },
        }));
        this.logger.log(`AdSpend created: tenant=${tenantId} amount=${dto.spendAmount} ${dto.currency ?? 'CLP'}`);
        return record;
    }
};
exports.AdSpendService = AdSpendService;
exports.AdSpendService = AdSpendService = AdSpendService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdSpendService);
//# sourceMappingURL=ad-spend.service.js.map