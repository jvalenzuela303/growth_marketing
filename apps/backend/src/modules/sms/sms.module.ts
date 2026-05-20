import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsChannel } from '../messaging/channels/sms.channel';
import { WhatsAppChannel } from '../messaging/channels/whatsapp.channel';

@Module({
  controllers: [SmsController],
  providers:   [SmsService, SmsChannel, WhatsAppChannel],
  exports:     [SmsService, SmsChannel],
})
export class SmsModule {}
