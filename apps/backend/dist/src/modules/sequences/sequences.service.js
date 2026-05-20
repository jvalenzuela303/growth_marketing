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
var SequencesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequencesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let SequencesService = SequencesService_1 = class SequencesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SequencesService_1.name);
    }
    async findAll(tenantId) {
        const rows = await this.prisma.withTenant(tenantId, () => this.prisma.emailSequence.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { enrollments: true } },
            },
        }));
        return rows.map(({ _count, steps, ...rest }) => ({
            ...rest,
            steps,
            stepCount: Array.isArray(steps) ? steps.length : 0,
            enrolledCount: _count.enrollments,
        }));
    }
    async create(tenantId, dto) {
        const sequence = await this.prisma.withTenant(tenantId, () => this.prisma.emailSequence.create({
            data: {
                tenantId,
                name: dto.name,
                trigger: dto.trigger,
                triggerSegments: dto.triggerSegments,
                minScore: dto.minScore,
                maxScore: dto.maxScore,
                steps: dto.steps ?? [],
                isActive: dto.isActive ?? true,
                ...(dto.funnelId && { funnelId: dto.funnelId }),
            },
        }));
        this.logger.log(`EmailSequence created: tenant=${tenantId} id=${sequence.id}`);
        return sequence;
    }
    async update(tenantId, id, dto) {
        await this.findOneOrFail(tenantId, id);
        return this.prisma.withTenant(tenantId, () => this.prisma.emailSequence.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.trigger !== undefined && { trigger: dto.trigger }),
                ...(dto.triggerSegments !== undefined && { triggerSegments: dto.triggerSegments }),
                ...(dto.minScore !== undefined && { minScore: dto.minScore }),
                ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
                ...(dto.steps !== undefined && { steps: dto.steps }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.funnelId !== undefined && { funnelId: dto.funnelId }),
            },
        }));
    }
    async remove(tenantId, id) {
        await this.findOneOrFail(tenantId, id);
        return this.prisma.withTenant(tenantId, () => this.prisma.emailSequence.delete({ where: { id } }));
    }
    async toggle(tenantId, id) {
        const sequence = await this.findOneOrFail(tenantId, id);
        return this.prisma.withTenant(tenantId, () => this.prisma.emailSequence.update({
            where: { id },
            data: { isActive: !sequence.isActive },
        }));
    }
    async findOneOrFail(tenantId, id) {
        const sequence = await this.prisma.withTenant(tenantId, () => this.prisma.emailSequence.findFirst({
            where: { id, tenantId },
        }));
        if (!sequence)
            throw new common_1.NotFoundException('Secuencia no encontrada.');
        return sequence;
    }
};
exports.SequencesService = SequencesService;
exports.SequencesService = SequencesService = SequencesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SequencesService);
//# sourceMappingURL=sequences.service.js.map