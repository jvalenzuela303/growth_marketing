import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';

@Injectable()
export class SequencesService {
  private readonly logger = new Logger(SequencesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const rows = await this.prisma.withTenant(tenantId, () =>
      this.prisma.emailSequence.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { enrollments: true } },
        },
      }),
    );

    return rows.map(({ _count, steps, ...rest }) => ({
      ...rest,
      steps,
      stepCount:     Array.isArray(steps) ? steps.length : 0,
      enrolledCount: _count.enrollments,
    }));
  }

  async create(tenantId: string, dto: CreateSequenceDto) {
    const sequence = await this.prisma.withTenant(tenantId, () =>
      this.prisma.emailSequence.create({
        data: {
          tenantId,
          name: dto.name,
          trigger: dto.trigger,
          triggerSegments: dto.triggerSegments,
          minScore: dto.minScore,
          maxScore: dto.maxScore,
          steps: (dto.steps as any) ?? [],
          isActive: dto.isActive ?? true,
          ...(dto.funnelId && { funnelId: dto.funnelId }),
        },
      }),
    );

    this.logger.log(`EmailSequence created: tenant=${tenantId} id=${sequence.id}`);
    return sequence;
  }

  async update(tenantId: string, id: string, dto: UpdateSequenceDto) {
    await this.findOneOrFail(tenantId, id);

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.emailSequence.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.trigger !== undefined && { trigger: dto.trigger }),
          ...(dto.triggerSegments !== undefined && { triggerSegments: dto.triggerSegments }),
          ...(dto.minScore !== undefined && { minScore: dto.minScore }),
          ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
          ...(dto.steps !== undefined && { steps: dto.steps as any }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.funnelId !== undefined && { funnelId: dto.funnelId }),
        },
      }),
    );
  }

  async remove(tenantId: string, id: string) {
    await this.findOneOrFail(tenantId, id);

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.emailSequence.delete({ where: { id } }),
    );
  }

  async toggle(tenantId: string, id: string) {
    const sequence = await this.findOneOrFail(tenantId, id);

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.emailSequence.update({
        where: { id },
        data: { isActive: !sequence.isActive },
      }),
    );
  }

  private async findOneOrFail(tenantId: string, id: string) {
    const sequence = await this.prisma.withTenant(tenantId, () =>
      this.prisma.emailSequence.findFirst({
        where: { id, tenantId },
      }),
    );

    if (!sequence) throw new NotFoundException('Secuencia no encontrada.');
    return sequence;
  }
}
