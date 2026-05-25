import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { TransbankService } from './transbank.service';

@Module({
  controllers: [BillingController],
  providers:   [BillingService, TransbankService],
  exports:     [BillingService],
})
export class BillingModule {}
