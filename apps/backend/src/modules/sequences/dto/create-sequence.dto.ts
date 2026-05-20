import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class CreateSequenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  trigger: string;

  @IsArray()
  @IsString({ each: true })
  triggerSegments: string[];

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

  /**
   * Array of step objects. Each step shape is defined by the frontend;
   * we store it as JSON without further validation at this layer.
   */
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
