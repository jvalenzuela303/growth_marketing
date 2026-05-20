import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAdSpendDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  source: string;

  @IsNumber()
  @Min(0)
  spendAmount: number;

  @IsString()
  @IsOptional()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  campaignName?: string;

  @IsUUID()
  @IsOptional()
  funnelId?: string;
}
