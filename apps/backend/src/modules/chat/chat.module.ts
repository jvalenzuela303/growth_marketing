import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LeadMemoryService } from './lead-memory.service';

@Module({
  controllers: [ChatController],
  providers:   [ChatService, LeadMemoryService],
  exports:     [ChatService, LeadMemoryService],
})
export class ChatModule {}
