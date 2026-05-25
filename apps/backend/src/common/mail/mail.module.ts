import { Global, Module } from '@nestjs/common';
import { MailNotifierService } from './mail-notifier.service';

@Global()
@Module({
  providers: [MailNotifierService],
  exports:   [MailNotifierService],
})
export class MailModule {}
