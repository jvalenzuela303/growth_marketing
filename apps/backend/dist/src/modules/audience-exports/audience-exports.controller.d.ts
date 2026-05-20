import { AudienceExportsService } from './audience-exports.service';
import { CreateAudienceExportDto } from './dto/create-audience-export.dto';
export declare class AudienceExportsController {
    private readonly audienceExportsService;
    constructor(audienceExportsService: AudienceExportsService);
    findAll(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        segment: string;
        status: string;
        type: string;
        metaAudienceId: string | null;
        leadCount: number;
        errorMessage: string | null;
        exportedAt: Date;
    }[]>;
    create(tenantId: string, dto: CreateAudienceExportDto): Promise<{
        id: string;
        tenantId: string;
        segment: string;
        status: string;
        type: string;
        metaAudienceId: string | null;
        leadCount: number;
        errorMessage: string | null;
        exportedAt: Date;
    }>;
}
