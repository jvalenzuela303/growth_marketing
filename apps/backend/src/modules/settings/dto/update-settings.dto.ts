import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEmail,
} from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  metaPixelId?: string;

  @IsOptional()
  @IsString()
  metaCapiToken?: string;

  @IsOptional()
  @IsString()
  metaWhatsappPhoneId?: string;

  @IsOptional()
  @IsString()
  metaWhatsappToken?: string;

  @IsOptional()
  @IsString()
  sendgridApiKey?: string;

  @IsOptional()
  @IsString()
  ghlApiKey?: string;

  @IsOptional()
  @IsString()
  ghlLocationId?: string;

  @IsOptional()
  @IsString()
  hubspotApiKey?: string;

  @IsOptional()
  @IsEmail()
  alertEmail?: string;

  @IsOptional()
  @IsBoolean()
  hotLeadAlertEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dailyDigestEnabled?: boolean;

  @IsOptional()
  @IsString()
  adAccountId?: string;

  @IsOptional()
  @IsString()
  calendlyApiKey?: string;
}
