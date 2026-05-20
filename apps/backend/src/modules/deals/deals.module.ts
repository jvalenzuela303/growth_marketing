import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports:     [WebhooksModule],
  controllers: [DealsController],
  providers:   [DealsService],
  exports:     [DealsService],
})
export class DealsModule {}
