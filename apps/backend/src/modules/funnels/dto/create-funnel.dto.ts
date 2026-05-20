import {
  IsString,
  IsOptional,
  IsObject,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateFunnelDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug debe contener solo letras minúsculas, números y guiones.',
  })
  @MaxLength(100)
  slug: string;

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
