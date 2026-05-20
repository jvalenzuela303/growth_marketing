import { Module } from '@nestjs/common';
import { AdCampaignsController } from './ad-campaigns.controller';
import { AdCampaignsService } from './ad-campaigns.service';

@Module({
  controllers: [AdCampaignsController],
  providers: [AdCampaignsService],
  exports: [AdCampaignsService],
})
export class AdCampaignsModule {}
