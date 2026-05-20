import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Health check endpoints para Cloud Run y load balancers.
 * /health → liveness (el proceso está vivo)
 * /ready  → readiness (la DB está conectada)
 */
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  liveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', db: 'connected', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'not_ready', db: 'disconnected', timestamp: new Date().toISOString() };
    }
  }
}
