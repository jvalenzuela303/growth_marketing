import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const MIN_LEADS_FOR_EXPORT = 100;

@Injectable()
export class AudienceExportsService {
  private readonly logger = new Logger(AudienceExportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.audienceExport.findMany({
        where: { tenantId },
        orderBy: { exportedAt: 'desc' },
      }),
    );
  }

  async create(tenantId: string, segment: string, type: string) {
    // Contar leads en el segmento para este tenant
    const leadCount = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.count({
        where: {
          tenantId,
          segment,
          deletedAt: null,
        },
      }),
    );

    if (leadCount < MIN_LEADS_FOR_EXPORT) {
      throw new BadRequestException(
        `Se necesitan al menos ${MIN_LEADS_FOR_EXPORT} leads en este segmento. Actualmente hay ${leadCount}.`,
      );
    }

    // Crear el registro en estado pendiente
    const audienceExport = await this.prisma.withTenant(tenantId, () =>
      this.prisma.audienceExport.create({
        data: {
          tenantId,
          segment,
          type,
          leadCount,
          status: 'pending',
        },
      }),
    );

    // Simular la llamada a la Meta API y actualizar a completado
    const metaAudienceId = `act_${Date.now()}`;

    const completed = await this.prisma.withTenant(tenantId, () =>
      this.prisma.audienceExport.update({
        where: { id: audienceExport.id },
        data: {
          status: 'completed',
          metaAudienceId,
        },
      }),
    );

    this.logger.log(
      `Audience export created: ${completed.id} | segment=${segment} | type=${type} | leads=${leadCount} | tenant=${tenantId}`,
    );

    return completed;
  }
}
