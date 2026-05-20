import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

function maskSecret(value: string | null | undefined): string | null {
  if (value == null || value.length === 0) return null;
  if (value.length <= 4) return '***...';
  return '***...' + value.slice(-4);
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        // Meta Ads
        metaPixelId:          true,
        metaCapiToken:        true,
        metaWhatsappPhoneId:  true,
        metaWhatsappToken:    true,
        // Instagram
        metaInstagramPageId:      true,
        metaInstagramAccessToken: true,
        // Email
        sendgridApiKey: true,
        // CRM
        ghlApiKey:      true,
        ghlLocationId:  true,
        hubspotApiKey:  true,
        // Notifications
        alertEmail:          true,
        hotLeadAlertEnabled: true,
        dailyDigestEnabled:  true,
        // Ads
        adAccountId: true,
        // Calendario
        googleCalendarRefreshToken: true,
        calendlyApiKey:             true,
      },
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    return {
      id: tenant.id,
      // Meta
      metaPixelId:          tenant.metaPixelId        ?? null,
      metaCapiToken:        maskSecret(tenant.metaCapiToken),
      metaWhatsappPhoneId:  tenant.metaWhatsappPhoneId ?? null,
      metaWhatsappToken:    maskSecret(tenant.metaWhatsappToken),
      // Instagram
      instagramConnected:   !!tenant.metaInstagramAccessToken,
      instagramPageId:      tenant.metaInstagramPageId ?? null,
      // Email
      sendgridApiKey: maskSecret(tenant.sendgridApiKey),
      // CRM
      ghlApiKey:      maskSecret(tenant.ghlApiKey),
      ghlLocationId:  tenant.ghlLocationId ?? null,
      hubspotApiKey:  maskSecret(tenant.hubspotApiKey),
      // Notifications
      alertEmail:          tenant.alertEmail          ?? null,
      hotLeadAlertEnabled: tenant.hotLeadAlertEnabled ?? false,
      dailyDigestEnabled:  tenant.dailyDigestEnabled  ?? false,
      // Ads
      adAccountId: tenant.adAccountId ?? null,
      // Calendario
      googleCalendarConnected: !!tenant.googleCalendarRefreshToken,
      calendlyApiKey:          maskSecret(tenant.calendlyApiKey),
    };
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto) {
    this.logger.log(`Actualizando settings para tenant ${tenantId}`);

    // Construir el objeto data solo con los campos definidos en el DTO,
    // mapeando nombres del DTO a nombres de columna de Prisma.
    const data: Record<string, unknown> = {};

    if (dto.metaPixelId         !== undefined) data.metaPixelId         = dto.metaPixelId;
    if (dto.metaCapiToken       !== undefined) data.metaCapiToken       = dto.metaCapiToken;
    if (dto.metaWhatsappPhoneId !== undefined) data.metaWhatsappPhoneId = dto.metaWhatsappPhoneId;
    if (dto.metaWhatsappToken   !== undefined) data.metaWhatsappToken   = dto.metaWhatsappToken;
    if (dto.sendgridApiKey      !== undefined) data.sendgridApiKey      = dto.sendgridApiKey;
    if (dto.ghlApiKey           !== undefined) data.ghlApiKey           = dto.ghlApiKey;
    if (dto.ghlLocationId       !== undefined) data.ghlLocationId       = dto.ghlLocationId;
    if (dto.hubspotApiKey       !== undefined) data.hubspotApiKey       = dto.hubspotApiKey;
    if (dto.alertEmail          !== undefined) data.alertEmail          = dto.alertEmail;
    if (dto.hotLeadAlertEnabled !== undefined) data.hotLeadAlertEnabled = dto.hotLeadAlertEnabled;
    if (dto.dailyDigestEnabled  !== undefined) data.dailyDigestEnabled  = dto.dailyDigestEnabled;
    if (dto.adAccountId         !== undefined) data.adAccountId         = dto.adAccountId;
    if (dto.calendlyApiKey      !== undefined) data.calendlyApiKey      = dto.calendlyApiKey;

    if (Object.keys(data).length === 0) {
      return this.getSettings(tenantId);
    }

    await this.prisma.tenant.update({ where: { id: tenantId }, data });
    this.logger.log(`Settings actualizados para tenant ${tenantId}`);
    return this.getSettings(tenantId);
  }
}
