import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { SendReplyDto } from './dto/send-reply.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  /**
   * GET /api/v1/conversations
   * Inbox: one entry per lead with last message + unread count.
   */
  @Get()
  getInbox(@TenantId() tenantId: string) {
    return this.conversationsService.getInbox(tenantId);
  }

  /**
   * GET /api/v1/conversations/:leadId/messages
   * Full message history for a lead.
   */
  @Get(':leadId/messages')
  getMessages(
    @TenantId() tenantId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
  ) {
    return this.conversationsService.getMessages(tenantId, leadId);
  }

  /**
   * POST /api/v1/conversations/:leadId/messages
   * Send a human_agent reply.
   */
  @Post(':leadId/messages')
  @HttpCode(HttpStatus.CREATED)
  sendReply(
    @TenantId() tenantId: string,
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: SendReplyDto,
  ) {
    return this.conversationsService.sendReply(
      tenantId,
      leadId,
      dto.content,
      dto.channel ?? 'chat',
    );
  }
}
