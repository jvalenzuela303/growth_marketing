import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /api/v1/chat/message
   * Respuesta síncrona (sigue soportada como fallback).
   */
  @Post('message')
  @HttpCode(HttpStatus.OK)
  sendMessage(
    @TenantId() tenantId: string,
    @Body() dto: ChatMessageDto,
  ) {
    return this.chatService.sendMessage(
      tenantId,
      dto.leadId,
      dto.message,
      dto.channel ?? 'chat',
    );
  }

  /**
   * GET /api/v1/chat/stream?leadId=<uuid>&message=<text>
   * Respuesta streaming via Server-Sent Events (text/event-stream).
   * El frontend usa fetch() con streaming body y Authorization header.
   *
   * Eventos:
   *   data: {"token":"..."}\n\n   → fragmento de texto generado
   *   data: [DONE]\n\n            → fin del stream
   *   data: {"error":"..."}\n\n   → error
   */
  @Get('stream')
  async streamMessage(
    @TenantId() tenantId: string,
    @Query('leadId')  leadId:  string,
    @Query('message') message: string,
    @Query('model')   model:   string,
    @Res() res: Response,
  ) {
    await this.chatService.streamMessage(tenantId, leadId, message, res, model);
  }

  /**
   * GET /api/v1/chat/models
   * Returns the list of supported AI models for the model selector UI.
   */
  @Get('models')
  getModels() {
    return [
      { id: 'claude-sonnet-4-6',           label: 'Claude Sonnet 4.6',  provider: 'anthropic', icon: 'claude'  },
      { id: 'claude-opus-4-6',             label: 'Claude Opus 4.6',    provider: 'anthropic', icon: 'claude'  },
      { id: 'claude-haiku-4-5-20251001',   label: 'Claude Haiku 4.5',   provider: 'anthropic', icon: 'claude'  },
      { id: 'gpt-4o',                      label: 'GPT-4o',             provider: 'openai',    icon: 'openai'  },
      { id: 'gpt-4o-mini',                 label: 'GPT-4o Mini',        provider: 'openai',    icon: 'openai'  },
      { id: 'gemini-1.5-pro',              label: 'Gemini 1.5 Pro',     provider: 'google',    icon: 'google'  },
    ];
  }
}
