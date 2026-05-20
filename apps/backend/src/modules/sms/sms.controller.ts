import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SmsService } from './sms.service';
import { SendSmsDto } from './dto/send-sms.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('sms')
@UseGuards(JwtAuthGuard)
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  /**
   * GET /api/v1/sms/status
   * Returns whether SMS (Twilio) is configured and available.
   */
  @Get('status')
  status() {
    return { available: this.smsService.isSmsAvailable() };
  }

  /**
   * POST /api/v1/sms/send
   * Send SMS directly to a phone number.
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  send(
    @TenantId() tenantId: string,
    @Body() dto: SendSmsDto,
  ) {
    return this.smsService.sendSms(tenantId, dto.to, dto.message, dto.leadId);
  }

  /**
   * POST /api/v1/sms/send-with-fallback
   * Tries WhatsApp first, falls back to SMS on failure.
   */
  @Post('send-with-fallback')
  @HttpCode(HttpStatus.OK)
  sendWithFallback(
    @TenantId() tenantId: string,
    @Body() dto: SendSmsDto,
  ) {
    return this.smsService.sendWithFallback(
      tenantId,
      dto.to,
      dto.message,
      dto.leadId,
    );
  }
}
