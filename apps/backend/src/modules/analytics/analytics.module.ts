import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { HealthController } from './health.controller';
import { AnalyticsService } from './analytics.service';
import { DealsModule } from '../deals/deals.module';

@Module({
  imports:     [DealsModule],
  controllers: [AnalyticsController, HealthController],
  providers:   [AnalyticsService],
  exports:     [AnalyticsService],
})
export class AnalyticsModule {}
