import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  /**
   * CRÍTICO para multi-tenancy: establece app.tenant_id en la sesión PostgreSQL
   * para que las Row-Level Security policies filtren automáticamente.
   *
   * Toda query a tablas con RLS (users, funnels, leads, conversations, lead_events)
   * DEBE ejecutarse dentro de withTenant(), de lo contrario la query retorna vacío
   * o falla según la policy configurada en la migración SQL.
   *
   * Uso:
   *   return this.prisma.withTenant(tenantId, () =>
   *     this.prisma.lead.findMany({ where: { ... } })
   *   );
   */
  async withTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn();
    });
  }

  /**
   * Variante que recibe la transacción explícitamente para componer operaciones
   * dentro de una misma transacción ya abierta.
   */
  async setTenantConfig(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, tenantId: string): Promise<void> {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
  }
}
