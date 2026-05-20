import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdCampaignsService {
  private readonly logger = new Logger(AdCampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, adsAccountId?: string) {
    const campaigns = await this.prisma.withTenant(tenantId, () =>
      this.prisma.adCampaign.findMany({
        where: {
          tenantId,
          ...(adsAccountId ? { adsAccountId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          metrics: {
            orderBy: { date: 'desc' },
            take: 1,
          },
        },
      }),
    );

    return campaigns.map(({ metrics, platform, ...rest }) => {
      const latest = metrics[0];
      return {
        ...rest,
        source:      platform,
        impressions: latest?.impressions ?? 0,
        clicks:      latest?.clicks      ?? 0,
        spend:       Number(latest?.spend ?? 0),
        leads:       latest?.leads       ?? 0,
      };
    });
  }

  async syncCampaigns(tenantId: string) {
    // Leer el adAccountId del tenant (campo agregado en iteración 3)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado.');
    }

    // En producción este sería el ID real de la cuenta Meta Ads.
    // Para entornos sin cuenta configurada se usa un ID mock para la simulación.
    const adAccountId =
      ((tenant as any).adAccountId as string | undefined) ?? 'mock_account';

    // Mock: en producción se llamaría a la Meta Ads API
    // Simulamos upsert de 2 campañas representativas
    const mockCampaigns = [
      {
        externalId: `${adAccountId}_camp_001`,
        name: 'Diagnóstico - Conversiones',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
        budgetDaily: 5000,
        impressions: Math.floor(Math.random() * 50000) + 10000,
        clicks: Math.floor(Math.random() * 2000) + 500,
        spend: parseFloat((Math.random() * 3000 + 1000).toFixed(2)),
      },
      {
        externalId: `${adAccountId}_camp_002`,
        name: 'Diagnóstico - Leads',
        status: 'PAUSED',
        objective: 'LEAD_GENERATION',
        budgetDaily: 3000,
        impressions: Math.floor(Math.random() * 30000) + 5000,
        clicks: Math.floor(Math.random() * 1000) + 200,
        spend: parseFloat((Math.random() * 1500 + 500).toFixed(2)),
      },
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const mock of mockCampaigns) {
      const campaign = await this.prisma.withTenant(tenantId, () =>
        this.prisma.adCampaign.upsert({
          where: {
            tenantId_externalId: {
              tenantId,
              externalId: mock.externalId,
            },
          },
          update: {
            name: mock.name,
            status: mock.status,
            objective: mock.objective,
            budgetDaily: mock.budgetDaily,
            lastSyncedAt: new Date(),
          },
          create: {
            tenantId,
            externalId: mock.externalId,
            name: mock.name,
            status: mock.status,
            objective: mock.objective,
            budgetDaily: mock.budgetDaily,
            platform: 'meta',
            lastSyncedAt: new Date(),
          },
        }),
      );

      // Upsert métrica del día
      const ctr = mock.clicks > 0 ? parseFloat((mock.clicks / mock.impressions).toFixed(4)) : 0;
      const cpm = mock.impressions > 0 ? parseFloat(((mock.spend / mock.impressions) * 1000).toFixed(4)) : 0;
      const cpc = mock.clicks > 0 ? parseFloat((mock.spend / mock.clicks).toFixed(4)) : 0;

      await this.prisma.withTenant(tenantId, () =>
        this.prisma.adCampaignMetric.upsert({
          where: {
            campaignId_date: {
              campaignId: campaign.id,
              date: today,
            },
          },
          update: {
            impressions: mock.impressions,
            clicks: mock.clicks,
            spend: mock.spend,
            ctr,
            cpm,
            cpc,
          },
          create: {
            campaignId: campaign.id,
            tenantId,
            date: today,
            impressions: mock.impressions,
            clicks: mock.clicks,
            spend: mock.spend,
            leads: Math.floor(mock.clicks * 0.05),
            ctr,
            cpm,
            cpc,
          },
        }),
      );
    }

    this.logger.log(`Sync completada para tenant ${tenantId}: 2 campañas actualizadas`);
    return { synced: 2, message: 'Sincronización completada.' };
  }

  async getMetrics(tenantId: string, campaignId: string, range: string) {
    // Verificar que la campaña pertenece al tenant
    const campaign = await this.prisma.withTenant(tenantId, () =>
      this.prisma.adCampaign.findFirst({
        where: { id: campaignId, tenantId },
      }),
    );

    if (!campaign) {
      throw new NotFoundException('Campaña no encontrada.');
    }

    // Calcular rango de fechas
    const days = this.parseDays(range);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const metrics = await this.prisma.withTenant(tenantId, () =>
      this.prisma.adCampaignMetric.findMany({
        where: {
          campaignId,
          tenantId,
          date: { gte: since },
        },
        orderBy: { date: 'asc' },
      }),
    );

    return { campaign, metrics, range, days };
  }

  // ─── helpers privados ────────────────────────────────────────────────────

  private parseDays(range: string): number {
    const match = range?.match(/^(\d+)d$/);
    if (match) return parseInt(match[1], 10);
    // fallback: 30 días
    return 30;
  }
}
