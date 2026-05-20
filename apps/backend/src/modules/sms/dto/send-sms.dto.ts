import { IsString, IsOptional, IsUUID, IsPhoneNumber } from 'class-validator';

export class SendSmsDto {
  @IsString()
  to: string;  // E.164 format preferred

  @IsString()
  message: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  withWhatsAppFallback?: boolean; // if true, try WhatsApp first then SMS
}
