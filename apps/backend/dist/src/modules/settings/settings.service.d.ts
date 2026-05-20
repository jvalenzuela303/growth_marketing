import { PrismaService } from '../../database/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
export declare class SettingsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getSettings(tenantId: string): Promise<{
        id: string;
        metaPixelId: string;
        metaCapiToken: string;
        metaWhatsappPhoneId: string;
        metaWhatsappToken: string;
        instagramConnected: boolean;
        instagramPageId: string;
        sendgridApiKey: string;
        ghlApiKey: string;
        ghlLocationId: string;
        hubspotApiKey: string;
        alertEmail: string;
        hotLeadAlertEnabled: boolean;
        dailyDigestEnabled: boolean;
        adAccountId: string;
        googleCalendarConnected: boolean;
        calendlyApiKey: string;
    }>;
    updateSettings(tenantId: string, dto: UpdateSettingsDto): Promise<{
        id: string;
        metaPixelId: string;
        metaCapiToken: string;
        metaWhatsappPhoneId: string;
        metaWhatsappToken: string;
        instagramConnected: boolean;
        instagramPageId: string;
        sendgridApiKey: string;
        ghlApiKey: string;
        ghlLocationId: string;
        hubspotApiKey: string;
        alertEmail: string;
        hotLeadAlertEnabled: boolean;
        dailyDigestEnabled: boolean;
        adAccountId: string;
        googleCalendarConnected: boolean;
        calendlyApiKey: string;
    }>;
}
