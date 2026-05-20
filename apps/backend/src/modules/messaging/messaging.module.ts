import { Module } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { EmailChannel } from './channels/email.channel';
import { InstagramChannel } from './channels/instagram.channel';
import { SmsChannel } from './channels/sms.channel';

@Module({
  providers: [MessagingService, WhatsAppChannel, EmailChannel, InstagramChannel, SmsChannel],
  exports:   [MessagingService, SmsChannel, WhatsAppChannel],
})
export class MessagingModule {}
