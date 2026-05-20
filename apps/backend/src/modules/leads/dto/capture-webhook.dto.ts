import {
  IsString,
  IsEmail,
  IsOptional,
  IsObject,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class WebhookMetaDto {
  @IsOptional()
  @IsString()
  fbclid?: string;

  @IsOptional()
  @IsString()
  fbp?: string;

  @IsOptional()
  @IsString()
  fbc?: string;

  @IsOptional()
  @IsString()
  pixelId?: string;
}

export class CaptureWebhookDto {
  @IsString()
  tenantId: string;

  @IsString()
  funnelId: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsIn(['meta_ads', 'instagram', 'facebook', 'organic', 'referral', 'email', 'whatsapp', 'landing_page', 'api', 'direct'])
  source?: string;

  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmMedium?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  utmContent?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookMetaDto)
  metaData?: WebhookMetaDto;

  @IsOptional()
  @IsObject()
  quizAnswers?: Record<string, unknown>;

  /**
   * ID de idempotencia — si ya existe un lead con este externalId para el
   * mismo tenant+funnel, se retorna el lead existente sin duplicar.
   */
  @IsOptional()
  @IsString()
  externalId?: string;
}
