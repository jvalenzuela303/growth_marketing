import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as crypto from 'crypto';

export interface CapiPurchasePayload {
  tenantId:  string
  email?:    string
  phone?:    string
  amount:    number
  currency:  string
  eventId:   string   // for deduplication
  sourceUrl: string
}

/**
 * MetaCapiService — server-side event dispatch to Meta Conversions API.
 *
 * Used internally (deal.won, audience updates) so that conversions are
 * tracked regardless of ad blockers or cookie consent on the client.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */
@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);
  private readonly graphBase = 'https://graph.facebook.com/v20.0';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Public helpers ─────────────────────────────────────────────────────────

  /**
   * Send a Purchase conversion event to Meta CAPI for the given tenant.
   * Silently skips if the tenant has no CAPI token configured.
   */
  async sendPurchaseEvent(payload: CapiPurchasePayload): Promise<void> {
    const { tenantId, email, phone, amount, currency, eventId, sourceUrl } = payload;

    const tenant = await this.prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { metaCapiToken: true, metaPixelId: true, isActive: true },
    });

    if (!tenant?.isActive) return;

    const accessToken = tenant.metaCapiToken || this.config.get<string>('META_CAPI_TOKEN', '');
    const pixelId     = tenant.metaPixelId;

    if (!accessToken || !pixelId) {
      this.logger.debug(`CAPI skip — tenant ${tenantId} has no pixel/token configured.`);
      return;
    }

    const userData: Record<string, string> = {};
    if (email) userData['em'] = this.sha256(email.trim().toLowerCase());
    if (phone) userData['ph'] = this.sha256(phone.replace(/\D/g, ''));

    const event = {
      event_name:        'Purchase',
      event_time:        Math.floor(Date.now() / 1000),
      event_id:          eventId,
      event_source_url:  sourceUrl,
      action_source:     'crm',
      user_data:         userData,
      custom_data: {
        value:    amount,
        currency: currency.toUpperCase(),
      },
    };

    try {
      const testCode = this.config.get<string>('META_CAPI_TEST_CODE');
      const body: Record<string, unknown> = { data: [event] };
      if (testCode) body['test_event_code'] = testCode;

      const res = await fetch(
        `${this.graphBase}/${pixelId}/events?access_token=${accessToken}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        },
      );

      const json = await res.json() as any;

      if (!res.ok) {
        this.logger.error(`CAPI Purchase error for tenant ${tenantId}: ${JSON.stringify(json)}`);
        return;
      }

      this.logger.log(
        `CAPI Purchase sent — tenant ${tenantId}, eventId ${eventId}, ` +
        `events_received=${json.events_received}`,
      );
    } catch (err: any) {
      this.logger.error(`CAPI fetch failed: ${err.message}`);
    }
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
