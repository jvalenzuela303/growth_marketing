import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

/**
 * TikTokAdsService — integración con TikTok Business API v1.3.
 *
 * OAuth2 flow:
 *   1. buildOAuthUrl(state) → redirect user to TikTok
 *   2. TikTok redirects back with auth_code → handleOAuthCallback()
 *      stores access_token in ads_accounts (platform='tiktok')
 *   3. getCampaigns() uses stored token to call /campaign/get/
 *
 * Docs: https://business-api.tiktok.com/portal/docs
 */
@Injectable()
export class TikTokAdsService {
  private readonly logger    = new Logger(TikTokAdsService.name);
  private readonly baseUrl   = 'https://business-api.tiktok.com/open_api/v1.3';
  private readonly authUrl   = 'https://business-api.tiktok.com/portal/auth';
  private readonly tokenUrl  = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── OAuth ───────────────────────────────────────────────────────────────────

  buildOAuthUrl(state: string): string {
    const appId       = this.config.get<string>('TIKTOK_APP_ID', '');
    const redirectUri = this.config.get<string>('TIKTOK_REDIRECT_URI', 'http://localhost:4001/api/v1/tiktok-ads/oauth/callback');

    if (!appId) {
      throw new BadRequestException('TIKTOK_APP_ID no configurado en .env');
    }

    const params = new URLSearchParams({
      app_id:       appId,
      state,
      redirect_uri: redirectUri,
    });

    return `${this.authUrl}?${params}`;
  }

  async handleOAuthCallback(authCode: string, tenantId: string, advertiserId: string): Promise<void> {
    const appId     = this.config.get<string>('TIKTOK_APP_ID', '');
    const appSecret = this.config.get<string>('TIKTOK_APP_SECRET', '');

    if (!appId || !appSecret) {
      throw new BadRequestException('TIKTOK_APP_ID o TIKTOK_APP_SECRET no configurados.');
    }

    // Exchange auth_code for access_token
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id:     appId,
        secret:     appSecret,
        auth_code:  authCode,
      }),
    });

    const body: any = await res.json();

    if (body.code !== 0) {
      throw new BadRequestException(`TikTok OAuth error: ${body.message ?? JSON.stringify(body)}`);
    }

    const accessToken  = body.data?.access_token as string;
    const accountName  = `TikTok — ${advertiserId}`;

    // Upsert into ads_accounts
    const existing = await this.prisma.adsAccount.findFirst({
      where: { tenantId, platform: 'tiktok', externalAccountId: advertiserId },
    });

    if (existing) {
      await this.prisma.adsAccount.update({
        where: { id: existing.id },
        data: { accessToken, status: 'active', lastSyncedAt: new Date(), syncErrorMessage: null },
      });
    } else {
      const count = await this.prisma.adsAccount.count({ where: { tenantId } });
      await this.prisma.adsAccount.create({
        data: {
          tenantId,
          name:              accountName,
          platform:          'tiktok',
          externalAccountId: advertiserId,
          accessToken,
          status:            'active',
          isDefault:         count === 0,
          lastSyncedAt:      new Date(),
        },
      });
    }

    this.logger.log(`TikTok Ads OAuth completado: tenant=${tenantId}, advertiser=${advertiserId}`);
  }

  async disconnect(tenantId: string, accountId: string): Promise<void> {
    const account = await this.prisma.adsAccount.findFirst({
      where: { id: accountId, tenantId, platform: 'tiktok' },
    });
    if (!account) throw new NotFoundException('Cuenta TikTok Ads no encontrada.');

    await this.prisma.adsAccount.update({
      where: { id: accountId },
      data: { accessToken: null, status: 'disconnected' },
    });
  }

  // ── Campaigns ───────────────────────────────────────────────────────────────

  async getCampaigns(tenantId: string, advertiserId: string, accountId?: string) {
    // Find the account with stored token
    const account = accountId
      ? await this.prisma.adsAccount.findFirst({ where: { id: accountId, tenantId } })
      : await this.prisma.adsAccount.findFirst({
          where: { tenantId, platform: 'tiktok', externalAccountId: advertiserId, status: 'active' },
        });

    if (!account) {
      throw new NotFoundException('Cuenta TikTok Ads no encontrada o desconectada.');
    }

    if (!account.accessToken) {
      throw new BadRequestException('La cuenta TikTok Ads no tiene token de acceso. Reconecta con OAuth.');
    }

    try {
      const campaigns = await this.fetchCampaigns(account.accessToken, advertiserId);
      const metrics   = await this.fetchMetrics(account.accessToken, advertiserId, campaigns.map((c) => c.campaign_id));

      const metricsMap = new Map<string, any>();
      for (const m of metrics) {
        metricsMap.set(m.dimensions?.campaign_id, m.metrics);
      }

      const result = campaigns.map((c: any) => {
        const m = metricsMap.get(c.campaign_id) ?? {};
        const spend       = parseFloat(m.spend ?? '0');
        const impressions = parseInt(m.impressions ?? '0', 10);
        const clicks      = parseInt(m.clicks ?? '0', 10);
        const conversions = parseFloat(m.conversion ?? '0');

        return {
          id:           c.campaign_id,
          name:         c.campaign_name,
          status:       c.operation_status,  // ENABLE | DISABLE | DELETE
          objective:    c.objective_type,
          budgetDaily:  parseFloat(c.budget ?? '0'),
          spend,
          impressions,
          clicks,
          conversions,
          ctr:          impressions > 0 ? clicks / impressions : 0,
          cpc:          clicks > 0 ? spend / clicks : 0,
          cpm:          impressions > 0 ? (spend / impressions) * 1000 : 0,
          platform:     'tiktok' as const,
        };
      });

      await this.prisma.adsAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date(), syncErrorMessage: null },
      });

      return { campaigns: result, account: { id: account.id, name: account.name, advertiserId } };
    } catch (err: any) {
      // If API fails, return cached campaigns from DB with a warning
      this.logger.warn(`TikTok API error, falling back to DB: ${err.message}`);

      const dbCampaigns = await this.prisma.adCampaign.findMany({
        where:   { tenantId, adsAccountId: account.id },
        include: { metrics: { orderBy: { date: 'desc' }, take: 1 } },
      });

      return {
        campaigns: dbCampaigns.map((c) => ({
          id:           c.externalId,
          name:         c.name,
          status:       c.status,
          objective:    c.objective ?? '',
          budgetDaily:  Number(c.budgetDaily ?? 0),
          spend:        Number(c.metrics[0]?.spend ?? 0),
          impressions:  c.metrics[0]?.impressions ?? 0,
          clicks:       c.metrics[0]?.clicks ?? 0,
          conversions:  0,
          ctr:          Number(c.metrics[0]?.ctr ?? 0),
          cpc:          Number(c.metrics[0]?.cpc ?? 0),
          cpm:          Number(c.metrics[0]?.cpm ?? 0),
          platform:     'tiktok' as const,
        })),
        account: { id: account.id, name: account.name, advertiserId },
        warning: 'Datos desde caché local (API TikTok no disponible)',
      };
    }
  }

  // ── Private API helpers ────────────────────────────────────────────────────

  private async fetchCampaigns(accessToken: string, advertiserId: string): Promise<any[]> {
    const url    = `${this.baseUrl}/campaign/get/?advertiser_id=${encodeURIComponent(advertiserId)}&page_size=20`;
    const res    = await fetch(url, {
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });
    const body: any = await res.json();
    if (body.code !== 0) throw new Error(`TikTok /campaign/get error: ${body.message}`);
    return body.data?.list ?? [];
  }

  private async fetchMetrics(accessToken: string, advertiserId: string, campaignIds: string[]): Promise<any[]> {
    if (campaignIds.length === 0) return [];

    const url    = `${this.baseUrl}/report/integrated/get/`;
    const res    = await fetch(url, {
      method: 'POST',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        advertiser_id: advertiserId,
        report_type:   'BASIC',
        dimensions:    ['campaign_id'],
        metrics:       ['spend', 'impressions', 'clicks', 'conversion', 'ctr', 'cpc', 'cpm'],
        data_level:    'AUCTION_CAMPAIGN',
        start_date:    this.daysAgo(30),
        end_date:      this.today(),
        filtering:     [{ field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify(campaignIds) }],
        page_size:     20,
      }),
    });
    const body: any = await res.json();
    if (body.code !== 0) return [];  // metrics are non-fatal
    return body.data?.list ?? [];
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }
}
