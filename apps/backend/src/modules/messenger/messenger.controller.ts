import {
  Controller, Get, Post, Query, Body, Res, HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { MessengerService } from './messenger.service';

interface MessengerWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    messaging: Array<{
      sender:    { id: string };
      recipient: { id: string };
      timestamp: number;
      message?:  { mid: string; text: string };
    }>;
  }>;
}

@ApiTags('messenger')
@Controller('messenger')
export class MessengerController {
  private readonly logger = new Logger(MessengerController.name);

  constructor(private readonly service: MessengerService) {}

  /**
   * GET /api/v1/messenger/webhook
   * Verificación del webhook por Meta (hub.challenge).
   */
  @Get('webhook')
  @ApiExcludeEndpoint()
  verify(
    @Query('hub.mode')         mode:      string,
    @Query('hub.verify_token') token:     string,
    @Query('hub.challenge')    challenge: string,
    @Res()                     res:       Response,
  ) {
    const result = this.service.verifyWebhook(mode, token, challenge);
    if (result) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  }

  /**
   * POST /api/v1/messenger/webhook
   * Recibe eventos de Messenger (mensajes entrantes).
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Facebook Messenger' })
  async receive(@Body() body: MessengerWebhookBody) {
    if (body.object !== 'page') return { ok: false };

    for (const entry of body.entry ?? []) {
      const pageId = entry.id;
      for (const event of entry.messaging ?? []) {
        if (event.message?.text) {
          this.service.handleInboundMessage(
            {
              senderId:    event.sender.id,
              recipientId: event.recipient.id,
              text:        event.message.text,
              timestamp:   event.timestamp,
              mid:         event.message.mid,
            },
            pageId,
          ).catch((err) => this.logger.error(`handleInboundMessage error: ${err.message}`));
        }
      }
    }

    return { ok: true };
  }
}
