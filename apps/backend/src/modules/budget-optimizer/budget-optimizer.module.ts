import { Module } from '@nestjs/common';
import { BudgetOptimizerController } from './budget-optimizer.controller';
import { BudgetOptimizerService } from './budget-optimizer.service';

@Module({
  controllers: [BudgetOptimizerController],
  providers:   [BudgetOptimizerService],
})
export class BudgetOptimizerModule {}
