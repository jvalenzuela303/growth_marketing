import { Module } from '@nestjs/common';
import { AdSpendController } from './ad-spend.controller';
import { AdSpendService } from './ad-spend.service';

@Module({
  controllers: [AdSpendController],
  providers: [AdSpendService],
  exports: [AdSpendService],
})
export class AdSpendModule {}
