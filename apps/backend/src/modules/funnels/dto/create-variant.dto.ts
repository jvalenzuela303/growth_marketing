import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateVariantDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  trafficSplit: number;

  @IsBoolean()
  @IsOptional()
  isControl?: boolean;
}
