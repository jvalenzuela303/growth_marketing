import { Module } from '@nestjs/common';
import { WebhooksController } from './meta-capi.controller';
import { MetaCapiService } from './meta-capi.service';

@Module({
  controllers: [WebhooksController],
  providers:   [MetaCapiService],
  exports:     [MetaCapiService],
})
export class WebhooksModule {}
