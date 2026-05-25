import { Module } from '@nestjs/common';
import { WidgetController } from './widget.controller';
import { ChatModule } from '../chat/chat.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports:     [ChatModule, AppointmentsModule],
  controllers: [WidgetController],
})
export class WidgetModule {}
