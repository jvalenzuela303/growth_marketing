import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAdSpendDto } from './ad-spend.dto';

@Injectable()
export class AdSpendService {
  private readonly logger = new Logger(AdSpendService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.withTenant(tenantId, () =>
      Promise.all([
        this.prisma.adSpend.findMany({
          where: { tenantId },
          orderBy: { periodStart: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.adSpend.count({ where: { tenantId } }),
      ]),
    );

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

  async create(tenantId: string, dto: CreateAdSpendDto) {
    const record = await this.prisma.withTenant(tenantId, () =>
      this.prisma.adSpend.create({
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
      }),
    );

    this.logger.log(`AdSpend created: tenant=${tenantId} amount=${dto.spendAmount} ${dto.currency ?? 'CLP'}`);
    return record;
  }
}
