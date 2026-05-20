import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  IsIn,
  IsObject,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateLeadDto {
  @IsUUID()
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
  @IsObject()
  quizAnswers?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  quizCompletionPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
