import { Module } from '@nestjs/common';
import { TikTokAdsService } from './tiktok-ads.service';
import { TikTokAdsController } from './tiktok-ads.controller';

@Module({
  controllers: [TikTokAdsController],
  providers:   [TikTokAdsService],
  exports:     [TikTokAdsService],
})
export class TikTokAdsModule {}
