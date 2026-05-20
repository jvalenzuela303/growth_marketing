import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../database/prisma.service';

// ─── Constantes ──────────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL   = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_BASE   = 'https://googleads.googleapis.com/v20';
const GOOGLE_ADS_SCOPE  = 'https://www.googleapis.com/auth/adwords';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface StoredTokens {
  refresh_token: string;
  access_token:  string;
  expires_at:    number; // unix ms
}

interface GoogleTokenResponse {
  access_token:  string;
  refresh_token?: string;
  expires_in:    number;
  token_type:    string;
}

interface GoogleAdsCampaign {
  campaign: {
    resourceName: string;
    id:           string;
    name:         string;
    status:       string;
    advertisingChannelType?: string;
  };
  campaignBudget?: {
    amountMicros: string; // micros → divide entre 1_000_000
  };
  metrics?: {
    impressions:           string;
    clicks:                string;
    costMicros:            string;
    conversions:           number;
    ctr:                   number;
    averageCpc:            string;
    averageCpm:            string;
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class GoogleAdsService {
  private readonly logger = new Logger(GoogleAdsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── OAuth helpers ────────────────────────────────────────────────────────

  /**
   * Construye la URL de autorización de Google OAuth 2.0.
   * El `state` lleva el tenantId para recuperarlo en el callback.
   *
   * access_type=offline  → garantiza que Google emita refresh_token
   * prompt=consent       → fuerza pantalla de consentimiento para obtener
   *                        refresh_token incluso si el usuario ya autorizó antes
   */
  buildOAuthUrl(tenantId: string): string {
    const clientId     = this.requireConfig('GOOGLE_ADS_CLIENT_ID');
    const redirectUri  = this.requireConfig('GOOGLE_ADS_REDIRECT_URI');

    const params = new URLSearchParams({
      client_id:     clientId,
      redirect_uri:  redirectUri,
      response_type: 'code',
      scope:         GOOGLE_ADS_SCOPE,
      access_type:   'offline',
      prompt:        'consent',
      state:         tenantId,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Intercambia el `code` de OAuth por access_token + refresh_token.
   * Persiste los tokens en el registro de la cuenta de Google Ads
   * (ads_accounts donde platform='google').
   *
   * Si todavía no existe el registro, lo crea con el customerId
   * que viene como parámetro (el usuario lo proporciona en el frontend
   * junto con el botón de "Conectar Google Ads").
   */
  async handleOAuthCallback(
    code:       string,
    tenantId:   string,
    customerId: string,
  ): Promise<void> {
    const clientId     = this.requireConfig('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = this.requireConfig('GOOGLE_ADS_CLIENT_SECRET');
    const redirectUri  = this.requireConfig('GOOGLE_ADS_REDIRECT_URI');

    // Intercambiar code → tokens
    const tokenRes = await axios.post<GoogleTokenResponse>(
      GOOGLE_TOKEN_URL,
      new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    ).catch((err) => {
      const detail = err.response?.data?.error_description ?? err.message;
      this.logger.error(`Error intercambiando code de Google: ${detail}`);
      throw new BadRequestException(`No se pudo intercambiar el código OAuth: ${detail}`);
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    if (!refresh_token) {
      // Esto pasa cuando el usuario ya autorizó antes y Google no reemite
      // el refresh_token. La solución: usar prompt=consent (ya está en buildOAuthUrl)
      // o revocar el acceso previo en myaccount.google.com/permissions.
      throw new BadRequestException(
        'Google no devolvió refresh_token. Revoca el acceso previo en myaccount.google.com/permissions y vuelve a conectar.',
      );
    }

    const tokens: StoredTokens = {
      refresh_token,
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    };

    // Normalizar customerId (eliminar guiones): "917-047-0641" → "9170470641"
    const normalizedId = customerId.replace(/-/g, '');

    // Obtener nombre de la cuenta desde la API para guardarlo descriptivamente
    let accountName = `Google Ads ${customerId}`;
    try {
      const info = await this.fetchCustomerInfo(normalizedId, tokens);
      accountName = info.descriptiveName ?? accountName;
    } catch {
      this.logger.warn(`No se pudo obtener nombre de la cuenta ${customerId}`);
    }

    // Upsert en ads_accounts
    await this.prisma.withTenant(tenantId, () =>
      this.prisma.adsAccount.upsert({
        where: {
          uq_ads_accounts_tenant_platform_external: {
            tenantId,
            platform:          'google',
            externalAccountId: normalizedId,
          },
        },
        update: {
          name:        accountName,
          accessToken: JSON.stringify(tokens),
          status:      'active',
          syncErrorMessage: null,
        },
        create: {
          tenantId,
          name:              accountName,
          platform:          'google',
          externalAccountId: normalizedId,
          accessToken:       JSON.stringify(tokens),
          status:            'active',
          isDefault:         false,
        },
      }),
    );

    this.logger.log(
      `Google Ads OAuth completado: tenant=${tenantId}, customerId=${normalizedId}`,
    );
  }

  /**
   * Desconecta la cuenta de Google Ads del tenant marcándola como 'disconnected'
   * y borrando los tokens almacenados.
   */
  async disconnect(tenantId: string, adsAccountId: string): Promise<void> {
    await this.prisma.withTenant(tenantId, () =>
      this.prisma.adsAccount.updateMany({
        where: { id: adsAccountId, tenantId, platform: 'google' },
        data: { accessToken: null, status: 'disconnected' },
      }),
    );
    this.logger.log(`Google Ads desconectado: tenant=${tenantId}, account=${adsAccountId}`);
  }

  // ─── Campaigns ────────────────────────────────────────────────────────────

  /**
   * Lista campañas de un Customer ID de Google Ads vía GAQL (Google Ads Query Language).
   *
   * customerId puede venir con o sin guiones (917-047-0641 ó 9170470641).
   * Si adsAccountId no se provee, usa la primera cuenta google del tenant.
   *
   * NOTA acceso Estándar: las métricas requieren un segmento de fecha en la query
   * (segments.date ó DURING). Sin él la API devuelve 0 en todas las métricas.
   */
  async getCampaigns(
    tenantId:    string,
    customerId:  string,
    adsAccountId?: string,
    days = 30,
  ) {
    const normalizedId = customerId.replace(/-/g, '');

    const account = await this.resolveAccount(tenantId, normalizedId, adsAccountId);
    const tokens  = this.parseTokens(account.accessToken);
    const fresh   = await this.getFreshAccessToken(tokens, account.id, tenantId);

    // Rango de fechas en formato YYYY-MM-DD requerido por GAQL con métricas
    const dateTo   = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateTo.getDate() - days);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // GAQL: Google Ads Query Language
    // - campaign_budget JOIN automático por la relación implícita
    // - metrics se agregan en el periodo especificado por BETWEEN
    // - REMOVED se excluye para no mostrar campañas eliminadas
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM campaign
      WHERE campaign.status != 'REMOVED'
        AND segments.date BETWEEN '${fmt(dateFrom)}' AND '${fmt(dateTo)}'
      ORDER BY metrics.cost_micros DESC
    `;

    const devToken     = this.requireConfig('GOOGLE_ADS_DEVELOPER_TOKEN');
    const loginCustId  = this.config.get<string>('GOOGLE_ADS_LOGIN_CUSTOMER_ID');

    const headers: Record<string, string> = {
      Authorization:    `Bearer ${fresh}`,
      'developer-token': devToken,
      'Content-Type':   'application/json',
    };

    // login-customer-id solo se incluye cuando se usa una cuenta MCC (manager)
    if (loginCustId) {
      headers['login-customer-id'] = loginCustId;
    }

    const res = await axios.post<{ results: GoogleAdsCampaign[] }>(
      `${GOOGLE_ADS_BASE}/customers/${normalizedId}/googleAds:search`,
      { query },
      { headers, timeout: 15_000 },
    ).catch((err) => {
      const detail = JSON.stringify(err.response?.data ?? err.message);
      this.logger.error(`Error Google Ads API: ${detail}`);

      // Marcar cuenta con error
      this.prisma.withTenant(tenantId, () =>
        this.prisma.adsAccount.update({
          where: { id: account.id },
          data: { status: 'error', syncErrorMessage: detail.slice(0, 500) },
        }),
      ).catch(() => {});

      throw new BadRequestException(`Error consultando Google Ads API: ${err.response?.data?.error?.message ?? err.message}`);
    });

    // Normalizar respuesta al mismo shape que Meta Ads para consistencia
    return (res.data.results ?? []).map((row) => ({
      id:          row.campaign.id,
      name:        row.campaign.name,
      status:      row.campaign.status,                         // ENABLED | PAUSED | REMOVED
      platform:    'google',
      channelType: row.campaign.advertisingChannelType ?? null,
      budgetDaily: row.campaignBudget
        ? Number(row.campaignBudget.amountMicros) / 1_000_000
        : null,
      impressions: Number(row.metrics?.impressions   ?? 0),
      clicks:      Number(row.metrics?.clicks        ?? 0),
      spend:       Number(row.metrics?.costMicros    ?? 0) / 1_000_000,
      conversions: row.metrics?.conversions          ?? 0,
      ctr:         row.metrics?.ctr                  ?? 0,
      cpc:         Number(row.metrics?.averageCpc    ?? 0) / 1_000_000,
      cpm:         Number(row.metrics?.averageCpm    ?? 0) / 1_000_000,
    }));
  }

  // ─── Helpers internos ─────────────────────────────────────────────────────

  /**
   * Obtiene un access_token fresco.
   * Si el almacenado no ha caducado (con 5 min de margen), lo reutiliza.
   * Si está caducado, lo refresca usando el refresh_token y actualiza la BD.
   */
  private async getFreshAccessToken(
    tokens:    StoredTokens,
    accountId: string,
    tenantId:  string,
  ): Promise<string> {
    const MARGIN_MS = 5 * 60 * 1000; // 5 minutos antes de expirar
    if (tokens.expires_at - Date.now() > MARGIN_MS) {
      return tokens.access_token;
    }

    this.logger.debug(`Refrescando access_token para account ${accountId}`);

    const clientId     = this.requireConfig('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = this.requireConfig('GOOGLE_ADS_CLIENT_SECRET');

    const res = await axios.post<GoogleTokenResponse>(
      GOOGLE_TOKEN_URL,
      new URLSearchParams({
        refresh_token: tokens.refresh_token,
        client_id:     clientId,
        client_secret: clientSecret,
        grant_type:    'refresh_token',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    ).catch((err) => {
      const detail = err.response?.data?.error ?? err.message;
      throw new UnauthorizedException(`No se pudo refrescar el token de Google: ${detail}`);
    });

    const updated: StoredTokens = {
      refresh_token: tokens.refresh_token, // refresh_token no cambia al refrescar
      access_token:  res.data.access_token,
      expires_at:    Date.now() + res.data.expires_in * 1000,
    };

    // Persiste el nuevo access_token sin bloquear el request
    this.prisma.withTenant(tenantId, () =>
      this.prisma.adsAccount.update({
        where: { id: accountId },
        data: { accessToken: JSON.stringify(updated) },
      }),
    ).catch((e) => this.logger.warn(`No se pudo persistir token refrescado: ${e.message}`));

    return updated.access_token;
  }

  /**
   * Resuelve la cuenta de Google Ads para el tenant dado un customerId.
   * Prioriza el adsAccountId si se provee; si no, busca por customerId.
   */
  private async resolveAccount(
    tenantId:    string,
    customerId:  string,
    adsAccountId?: string,
  ) {
    const where = adsAccountId
      ? { id: adsAccountId, tenantId, platform: 'google' }
      : { tenantId, platform: 'google', externalAccountId: customerId };

    const account = await this.prisma.withTenant(tenantId, () =>
      this.prisma.adsAccount.findFirst({ where }),
    );

    if (!account) {
      throw new BadRequestException(
        `No se encontró cuenta de Google Ads (customerId=${customerId}) para este tenant. ` +
        'Conecta la cuenta primero desde la página de Publicidad.',
      );
    }

    if (!account.accessToken) {
      throw new UnauthorizedException(
        'La cuenta de Google Ads no tiene tokens almacenados. Vuelve a conectarla.',
      );
    }

    return account;
  }

  private parseTokens(raw: string | null): StoredTokens {
    if (!raw) throw new UnauthorizedException('Token de Google Ads no configurado.');
    try {
      return JSON.parse(raw) as StoredTokens;
    } catch {
      throw new UnauthorizedException('Token de Google Ads tiene formato inválido.');
    }
  }

  /**
   * Obtiene información básica del customer (nombre, moneda, zona horaria)
   * usando el endpoint customers/{id}.
   */
  private async fetchCustomerInfo(
    customerId: string,
    tokens:     StoredTokens,
  ): Promise<{ descriptiveName?: string; currencyCode?: string }> {
    const devToken = this.requireConfig('GOOGLE_ADS_DEVELOPER_TOKEN');

    const query = `
      SELECT customer.id, customer.descriptive_name, customer.currency_code
      FROM customer
      LIMIT 1
    `;

    const res = await axios.post<{
      results: Array<{ customer: { id: string; descriptiveName?: string; currencyCode?: string } }>
    }>(
      `${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`,
      { query },
      {
        headers: {
          Authorization:    `Bearer ${tokens.access_token}`,
          'developer-token': devToken,
          'Content-Type':   'application/json',
        },
        timeout: 8_000,
      },
    );

    return res.data.results?.[0]?.customer ?? {};
  }

  private requireConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new BadRequestException(
        `Variable de entorno ${key} no está configurada. Agrégala a apps/backend/.env`,
      );
    }
    return value;
  }
}
