import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';

const EMPTY_GRAPH = { nodes: [], edges: [] };

@Injectable()
export class AutomationFlowsService {
  private readonly logger = new Logger(AutomationFlowsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.automationFlow.findMany({
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
      }),
    );
  }

  async findOne(tenantId: string, id: string) {
    const flow = await this.prisma.withTenant(tenantId, () =>
      this.prisma.automationFlow.findFirst({
        where: { id, tenantId, deletedAt: null },
      }),
    );
    if (!flow) throw new NotFoundException('Flujo de automatización no encontrado.');
    return flow;
  }

  async create(tenantId: string, userId: string, dto: CreateFlowDto) {
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.automationFlow.create({
        data: {
          tenantId,
          createdBy: userId,
          name:        dto.name,
          description: dto.description,
          trigger:     dto.trigger ?? 'manual',
          graph:       (dto.graph as any) ?? EMPTY_GRAPH,
        },
      }),
    );
  }

  async update(tenantId: string, id: string, dto: UpdateFlowDto) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.automationFlow.update({
        where: { id },
        data: {
          ...(dto.name        !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.trigger     !== undefined && { trigger: dto.trigger }),
          ...(dto.graph       !== undefined && { graph: dto.graph as any }),
        },
      }),
    );
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.automationFlow.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    );
  }

  async activate(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.automationFlow.update({
        where: { id },
        data: { status: 'active' },
      }),
    );
  }

  async pause(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.automationFlow.update({
        where: { id },
        data: { status: 'paused' },
      }),
    );
  }

  /**
   * Manual trigger: simulate execution, log steps, increment runCount.
   * Real BullMQ execution would enqueue a job; for now we do a synchronous
   * dry-run and return the execution log.
   */
  async run(tenantId: string, id: string, leadId?: string) {
    const flow = await this.findOne(tenantId, id);
    const graph = (flow.graph as any) ?? EMPTY_GRAPH;
    const nodes: any[] = graph.nodes ?? [];

    const log: Array<{ nodeId: string; type: string; status: string; ts: string }> = [];

    for (const node of nodes) {
      log.push({
        nodeId: node.id,
        type:   node.data?.type ?? node.type ?? 'unknown',
        status: 'ok',
        ts:     new Date().toISOString(),
      });
    }

    const runRecord = await this.prisma.withTenant(tenantId, () =>
      this.prisma.automationFlowRun.create({
        data: {
          flowId:     id,
          tenantId,
          leadId:     leadId ?? null,
          status:     'completed',
          log:        log as any,
          finishedAt: new Date(),
        },
      }),
    );

    await this.prisma.withTenant(tenantId, () =>
      this.prisma.automationFlow.update({
        where: { id },
        data: {
          lastRunAt: new Date(),
          runCount:  { increment: 1 },
        },
      }),
    );

    this.logger.log(`Flow ${id} executed: ${nodes.length} nodes processed`);
    return { runId: runRecord.id, log };
  }

  async getRuns(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.automationFlowRun.findMany({
      where: { flowId: id, tenantId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
  }
}
