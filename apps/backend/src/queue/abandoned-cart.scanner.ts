import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EcommerceService } from '../modules/ecommerce/ecommerce.service';

/**
 * AbandonedCartScanner
 *
 * Registers a BullMQ repeatable job that fires every hour.
 * MessagingProcessor handles the 'abandoned-cart-scan' job and delegates
 * to EcommerceService.scanAbandonedCarts().
 *
 * Design mirrors FollowUpScheduler — all async work stays inside BullMQ
 * so it scales horizontally with multiple workers.
 */
@Injectable()
export class AbandonedCartScanner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AbandonedCartScanner.name);

  // Exposed so MessagingProcessor can call it when the job fires
  constructor(readonly ecommerce: EcommerceService) {}

  async onModuleInit() {
    this.logger.log('AbandonedCartScanner inicializado — escaneo cada 1h via MessagingProcessor.');
  }

  async onModuleDestroy() {
    // Nothing to clean up — job registration is in MessagingProcessor
  }

  async runScan(): Promise<void> {
    await this.ecommerce.scanAbandonedCarts();
  }
}
