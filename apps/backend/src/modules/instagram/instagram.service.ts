import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../database/prisma.service';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const INSTAGRAM_OAUTH_BASE = 'https://api.instagram.com/oauth/authorize';
const TOKEN_EXCHANGE_URL = 'https://graph.instagram.com/access_token';

/**
 * InstagramService — gestiona el ciclo completo de Instagram DM:
 *  1. OAuth: genera URL de autorización e intercambia code por token.
 *  2. Envío de DMs: POST a Graph API usando el token del tenant.
 *  3. Webhook: procesa mensajes entrantes y los persiste como conversaciones.
 */
@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── OAuth ────────────────────────────────────────────────────────────────

  /**
   * Genera la URL de autorización de Instagram OAuth 2.0.
   * El `state` lleva el tenantId para recuperarlo en el callback.
   */
  buildOAuthUrl(tenantId: string): string {
    const appId       = this.config.get<string>('META_APP_ID');
    const redirectUri = this.config.get<string>('META_INSTAGRAM_REDIRECT_URI');

    if (!appId || !redirectUri) {
      throw new BadRequestException(
        'META_APP_ID y META_INSTAGRAM_REDIRECT_URI deben estar configurados.',
      );
    }

    const params = new URLSearchParams({
      client_id:     appId,
      redirect_uri:  redirectUri,
      scope:         'instagram_manage_messages,pages_manage_metadata,pages_messaging',
      response_type: 'code',
      state:         tenantId,
    });

    return `${INSTAGRAM_OAUTH_BASE}?${params.toString()}`;
  }

  /**
   * Procesa el callback de OAuth:
   *  1. Intercambia `code` por un access_token de corta duración.
   *  2. Intercambia ese token por uno de larga duración (60 días).
   *  3. Obtiene el Page ID de Instagram asociado.
   *  4. Guarda ambos en el tenant.
   */
  async handleOAuthCallback(code: string, tenantId: string): Promise<void> {
    const appId       = this.config.get<string>('META_APP_ID');
    const appSecret   = this.config.get<string>('META_APP_SECRET');
    const redirectUri = this.config.get<string>('META_INSTAGRAM_REDIRECT_URI');

    if (!appId || !appSecret || !redirectUri) {
      throw new BadRequestException('Credenciales META no configuradas en el servidor.');
    }

    // Paso 1: token de corta duración
    const shortTokenRes = await axios.get<{ access_token: string; token_type: string }>(
      'https://api.instagram.com/oauth/access_token',
      {
        params: {
          client_id:     appId,
          client_secret: appSecret,
          grant_type:    'authorization_code',
          redirect_uri:  redirectUri,
          code,
        },
      },
    ).catch((err) => {
      this.logger.error(`Error intercambiando code: ${err.response?.data?.error_description}`);
      throw new BadRequestException('No se pudo intercambiar el código OAuth de Instagram.');
    });

    const shortToken = shortTokenRes.data.access_token;

    // Paso 2: intercambio por token de larga duración
    const longTokenRes = await axios.get<{ access_token: string; token_type: string; expires_in: number }>(
      TOKEN_EXCHANGE_URL,
      {
        params: {
          grant_type:    'ig_exchange_token',
          client_secret: appSecret,
          access_token:  shortToken,
        },
      },
    ).catch(() => {
      throw new BadRequestException('No se pudo obtener token de larga duración de Instagram.');
    });

    const longToken = longTokenRes.data.access_token;

    // Paso 3: obtener Page ID (Instagram Business Account ID)
    const meRes = await axios.get<{ id: string; username: string }>(
      'https://graph.instagram.com/me',
      {
        params: {
          fields:       'id,username',
          access_token: longToken,
        },
      },
    ).catch(() => {
      throw new BadRequestException('No se pudo obtener el perfil de Instagram.');
    });

    const pageId = meRes.data.id;
    this.logger.log(`Instagram OAuth completado para tenant ${tenantId}: pageId=${pageId}`);

    // Paso 4: persistir en tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        metaInstagramPageId:      pageId,
        metaInstagramAccessToken: longToken,
      } as any,
    });
  }

  /**
   * Desconecta Instagram: borra token y page ID del tenant.
   */
  async disconnect(tenantId: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        metaInstagramPageId:      null,
        metaInstagramAccessToken: null,
      } as any,
    });
    this.logger.log(`Instagram desconectado para tenant ${tenantId}`);
  }

  /**
   * Devuelve el estado de la conexión Instagram del tenant.
   */
  async getStatus(tenantId: string): Promise<{ connected: boolean; pageId: string | null; username: string | null }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        metaInstagramPageId:      true,
        metaInstagramAccessToken: true,
      } as any,
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const pageId = (tenant as any).metaInstagramPageId as string | null;
    const token  = (tenant as any).metaInstagramAccessToken as string | null;

    if (!pageId || !token) {
      return { connected: false, pageId: null, username: null };
    }

    // Intentar obtener username actual
    try {
      const res = await axios.get<{ id: string; username: string }>(
        'https://graph.instagram.com/me',
        { params: { fields: 'id,username', access_token: token } },
      );
      return { connected: true, pageId, username: res.data.username ?? null };
    } catch {
      return { connected: true, pageId, username: null };
    }
  }

  // ─── Envío de DMs ─────────────────────────────────────────────────────────

  /**
   * Envía un DM de texto a un usuario de Instagram.
   * `igUserId` es el sender ID que llegó en el webhook.
   */
  async sendDM(tenantId: string, igUserId: string, text: string): Promise<{ messageId?: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { metaInstagramPageId: true, metaInstagramAccessToken: true } as any,
    });

    const pageId = (tenant as any)?.metaInstagramPageId as string | null;
    const token  = (tenant as any)?.metaInstagramAccessToken as string | null;

    if (!pageId || !token) {
      throw new BadRequestException('Instagram no está conectado para este tenant.');
    }

    const res = await axios.post<{ message_id: string }>(
      `${GRAPH_API}/${pageId}/messages`,
      {
        recipient: { id: igUserId },
        message:   { text },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10_000,
      },
    ).catch((err) => {
      this.logger.error(`Error enviando DM Instagram: ${JSON.stringify(err.response?.data)}`);
      throw new BadRequestException('Error enviando DM de Instagram.');
    });

    return { messageId: res.data.message_id };
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  /**
   * Procesa el payload del webhook de Instagram DM enviado por Meta.
   * Itera cada entrada y persiste los mensajes entrantes como conversaciones.
   */
  async processWebhook(payload: any): Promise<void> {
    if (payload?.object !== 'instagram') return;

    for (const entry of payload?.entry ?? []) {
      const pageId = entry.id as string;

      // Encontrar el tenant por pageId
      const tenant = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM tenants
        WHERE meta_instagram_page_id = ${pageId}
          AND deleted_at IS NULL
        LIMIT 1
      `.catch(() => [] as Array<{ id: string }>);

      if (!tenant.length) {
        this.logger.warn(`Webhook Instagram: no se encontró tenant para pageId=${pageId}`);
        continue;
      }

      const tenantId = tenant[0].id;

      for (const event of entry?.messaging ?? []) {
        const senderId  = event?.sender?.id as string;
        const text      = event?.message?.text as string | undefined;
        const messageId = event?.message?.mid as string | undefined;

        if (!senderId || !text) continue; // ignorar eventos sin texto (stickers, etc.)

        // Buscar o crear un lead por instagramUserId
        const lead = await this.findOrCreateInstagramLead(tenantId, senderId);

        // Persistir mensaje como conversación (role=user — viene del lead)
        await this.prisma.withTenant(tenantId, () =>
          this.prisma.conversation.create({
            data: {
              tenantId,
              leadId:            lead.id,
              channel:           'instagram',
              role:              'user',
              content:           text,
              contentType:       'text',
              status:            'delivered',
              externalMessageId: messageId,
              metadata:          { igUserId: senderId },
            },
          }),
        );

        this.logger.debug(`Instagram DM guardado: lead=${lead.id}, msg="${text.slice(0, 50)}"`);
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findOrCreateInstagramLead(
    tenantId: string,
    igUserId: string,
  ): Promise<{ id: string }> {
    // Buscar lead existente por instagramUserId en metadata
    const existing = await this.prisma.withTenant(tenantId, () =>
      this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM leads
        WHERE tenant_id  = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND quiz_answers->>'instagramUserId' = ${igUserId}
        LIMIT 1
      `,
    );

    if (existing.length) return { id: existing[0].id };

    // Crear lead básico para este usuario de Instagram.
    // El IG user ID se guarda en quizAnswers como identificador externo.
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.create({
        data: {
          tenantId,
          source:          'instagram',
          quizAnswers:     { instagramUserId: igUserId },
          quizScore:       0,
          behaviorScore:   0,
          engagementScore: 0,
          demographicScore: 0,
        },
      }),
    );

    return { id: lead.id };
  }
}
