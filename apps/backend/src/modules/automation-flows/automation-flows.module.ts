import { Module } from '@nestjs/common';
import { AutomationFlowsController } from './automation-flows.controller';
import { AutomationFlowsService } from './automation-flows.service';

@Module({
  controllers: [AutomationFlowsController],
  providers:   [AutomationFlowsService],
})
export class AutomationFlowsModule {}
