import { Module, forwardRef } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { QueueModule } from '../../queue/queue.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { GestionClinicaModule } from '../integrations/gestion-clinica/gestion-clinica.module';

@Module({
  imports: [forwardRef(() => QueueModule), RealtimeModule, GestionClinicaModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
