import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IsString, IsOptional, IsObject, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../database/prisma.service';

class CapiEventDto {
  @IsString()
  event_name: string; // 'Lead', 'Purchase', 'PageView', etc.

  @IsNumber()
  event_time: number; // Unix timestamp

  @IsOptional()
  @IsString()
  event_id?: string; // Para deduplicación con el Pixel del frontend

  @IsOptional()
  @IsString()
  event_source_url?: string;

  @IsOptional()
  @IsObject()
  user_data?: {
    em?: string; // email hasheado SHA-256
    ph?: string; // phone hasheado SHA-256
    fbp?: string;
    fbc?: string;
    client_ip_address?: string;
    client_user_agent?: string;
  };

  @IsOptional()
  @IsObject()
  custom_data?: Record<string, unknown>;
}

class MetaCapiWebhookDto {
  @IsString()
  tenantId: string;

  @IsString()
  pixelId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapiEventDto)
  events: CapiEventDto[];
}

/**
 * Meta Conversions API (CAPI) — Server-Side Events
 *
 * El frontend envía eventos al backend para reenviarlos a Meta CAPI.
 * Esto mejora la atribución frente a ad blockers y limitaciones de cookies.
 *
 * Deduplicación: se usa event_id para que Meta fusione el evento del Pixel
 * del browser con el evento del servidor y no lo cuente dos veces.
 *
 * Referencia: https://developers.facebook.com/docs/marketing-api/conversions-api
 */
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /api/v1/webhooks/meta/verify
   * Verificación del webhook de Meta (handshake inicial).
   */
  @Get('meta/verify')
  verifyMetaWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const expectedToken = this.config.get<string>('META_WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && verifyToken === expectedToken) {
      return parseInt(challenge, 10);
    }
    throw new BadRequestException('Verificación de webhook fallida.');
  }

  /**
   * POST /api/v1/webhooks/meta
   * Server-Side Conversions API — reenvía eventos a Meta CAPI.
   *
   * curl -X POST http://localhost:3001/api/v1/webhooks/meta \
   *   -H "Content-Type: application/json" \
   *   -d '{"tenantId":"...","pixelId":"...","events":[{"event_name":"Lead","event_time":1700000000,"event_id":"evt_123"}]}'
   */
  @Post('meta')
  @HttpCode(HttpStatus.OK)
  async sendToMetaCapi(@Body() dto: MetaCapiWebhookDto, @Req() req: Request) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
      select: { metaCapiToken: true, metaPixelId: true, isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      throw new BadRequestException('Tenant no encontrado o inactivo.');
    }

    const accessToken = tenant.metaCapiToken || this.config.get<string>('META_CAPI_TOKEN');
    const pixelId = tenant.metaPixelId || dto.pixelId;

    if (!accessToken) {
      throw new BadRequestException('Meta CAPI token no configurado para este tenant.');
    }

    // Enriquecer eventos con IP y User-Agent del request original
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const enrichedEvents = dto.events.map((event) => ({
      ...event,
      user_data: {
        ...event.user_data,
        client_ip_address: event.user_data?.client_ip_address || ipAddress,
        client_user_agent: event.user_data?.client_user_agent || userAgent,
      },
      action_source: 'website',
    }));

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v19.0/${pixelId}/events`,
        {
          data: enrichedEvents,
          test_event_code: this.config.get<string>('META_CAPI_TEST_CODE'), // solo en dev
        },
        {
          params: { access_token: accessToken },
          timeout: 10000,
        },
      );

      this.logger.debug(
        `CAPI: ${enrichedEvents.length} evento(s) enviados a pixel ${pixelId}. ` +
        `events_received: ${response.data?.events_received}`,
      );

      return {
        success: true,
        eventsReceived: response.data?.events_received,
        fbc: response.data?.fbc,
      };
    } catch (error: any) {
      const errorData = error.response?.data;
      this.logger.error(`Error Meta CAPI: ${JSON.stringify(errorData)}`);
      throw new BadRequestException(`Meta CAPI error: ${errorData?.error?.message || error.message}`);
    }
  }

  /**
   * POST /api/v1/webhooks/meta/leads
   * Recibe leads directamente desde Meta Lead Ads (via webhook de página de Facebook).
   * Valida firma HMAC-SHA256 del payload.
   */
  @Post('meta/leads')
  @HttpCode(HttpStatus.OK)
  async receiveMetaLeadAd(@Body() payload: any, @Req() req: Request) {
    const signature = req.headers['x-hub-signature-256'] as string;
    const appSecret = this.config.get<string>('META_APP_SECRET');

    if (appSecret && signature) {
      const crypto = await import('crypto');
      const expectedSignature =
        'sha256=' +
        crypto
          .createHmac('sha256', appSecret)
          .update(JSON.stringify(payload))
          .digest('hex');

      if (signature !== expectedSignature) {
        throw new BadRequestException('Firma HMAC inválida.');
      }
    }

    this.logger.log(`Lead Ad webhook recibido: ${JSON.stringify(payload?.entry?.length)} entradas`);
    // El procesamiento completo de Lead Ads se delega a n8n/worker
    return { status: 'received' };
  }
}
