import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UpdateSequenceDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  trigger?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  triggerSegments?: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  minScore?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  maxScore?: number;

  @IsArray()
  @IsOptional()
  steps?: object[];

  @IsUUID()
  @IsOptional()
  funnelId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
