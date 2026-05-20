import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class UpdateVariantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  trafficSplit?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
