import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateDealDto {
  @IsUUID()
  leadId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsUUID()
  funnelId?: string;

  @IsOptional()
  @IsUUID()
  adsAccountId?: string;

  @IsOptional()
  @IsString()
  campaignName?: string;

  @IsOptional()
  @IsIn(['manual', 'meta_ads', 'google_ads', 'organic'])
  source?: string;

  @IsOptional()
  @IsIn(['won', 'lost', 'refunded'])
  stage?: string;

  @IsOptional()
  @IsDateString()
  closedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
