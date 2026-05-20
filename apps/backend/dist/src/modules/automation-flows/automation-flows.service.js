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
var AutomationFlowsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationFlowsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const EMPTY_GRAPH = { nodes: [], edges: [] };
let AutomationFlowsService = AutomationFlowsService_1 = class AutomationFlowsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AutomationFlowsService_1.name);
    }
    async findAll(tenantId) {
        return this.prisma.withTenant(tenantId, () => this.prisma.automationFlow.findMany({
            where: { tenantId, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                description: true,
                trigger: true,
                status: true,
                runCount: true,
                lastRunAt: true,
                createdAt: true,
                updatedAt: true,
            },
        }));
    }
    async findOne(tenantId, id) {
        const flow = await this.prisma.withTenant(tenantId, () => this.prisma.automationFlow.findFirst({
            where: { id, tenantId, deletedAt: null },
        }));
        if (!flow)
            throw new common_1.NotFoundException('Flujo de automatización no encontrado.');
        return flow;
    }
    async create(tenantId, userId, dto) {
        return this.prisma.withTenant(tenantId, () => this.prisma.automationFlow.create({
            data: {
                tenantId,
                createdBy: userId,
                name: dto.name,
                description: dto.description,
                trigger: dto.trigger ?? 'manual',
                graph: dto.graph ?? EMPTY_GRAPH,
            },
        }));
    }
    async update(tenantId, id, dto) {
        await this.findOne(tenantId, id);
        return this.prisma.withTenant(tenantId, () => this.prisma.automationFlow.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.trigger !== undefined && { trigger: dto.trigger }),
                ...(dto.graph !== undefined && { graph: dto.graph }),
            },
        }));
    }
    async remove(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.withTenant(tenantId, () => this.prisma.automationFlow.update({
            where: { id },
            data: { deletedAt: new Date() },
        }));
    }
    async activate(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.withTenant(tenantId, () => this.prisma.automationFlow.update({
            where: { id },
            data: { status: 'active' },
        }));
    }
    async pause(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.withTenant(tenantId, () => this.prisma.automationFlow.update({
            where: { id },
            data: { status: 'paused' },
        }));
    }
    async run(tenantId, id, leadId) {
        const flow = await this.findOne(tenantId, id);
        const graph = flow.graph ?? EMPTY_GRAPH;
        const nodes = graph.nodes ?? [];
        const log = [];
        for (const node of nodes) {
            log.push({
                nodeId: node.id,
                type: node.data?.type ?? node.type ?? 'unknown',
                status: 'ok',
                ts: new Date().toISOString(),
            });
        }
        const runRecord = await this.prisma.withTenant(tenantId, () => this.prisma.automationFlowRun.create({
            data: {
                flowId: id,
                tenantId,
                leadId: leadId ?? null,
                status: 'completed',
                log: log,
                finishedAt: new Date(),
            },
        }));
        await this.prisma.withTenant(tenantId, () => this.prisma.automationFlow.update({
            where: { id },
            data: {
                lastRunAt: new Date(),
                runCount: { increment: 1 },
            },
        }));
        this.logger.log(`Flow ${id} executed: ${nodes.length} nodes processed`);
        return { runId: runRecord.id, log };
    }
    async getRuns(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.automationFlowRun.findMany({
            where: { flowId: id, tenantId },
            orderBy: { startedAt: 'desc' },
            take: 20,
        });
    }
};
exports.AutomationFlowsService = AutomationFlowsService;
exports.AutomationFlowsService = AutomationFlowsService = AutomationFlowsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AutomationFlowsService);
//# sourceMappingURL=automation-flows.service.js.map