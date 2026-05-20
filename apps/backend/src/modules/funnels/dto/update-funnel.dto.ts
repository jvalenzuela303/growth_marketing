import { IsString, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';

export class UpdateFunnelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  quizConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  landingConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  resultsConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  scoringRules?: Record<string, unknown>;
}
