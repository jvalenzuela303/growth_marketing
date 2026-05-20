import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class WidgetController {
    private readonly prisma;
    private readonly config;
    constructor(prisma: PrismaService, config: ConfigService);
    getConfig(slug: string): Promise<{
        tenantSlug: string;
        tenantName: string;
        widgetTitle: string;
        primaryColor: string;
        position: string;
        funnelId: string;
        quizUrl: string;
    }>;
    getScript(slug: string, res: Response): Promise<void>;
}
