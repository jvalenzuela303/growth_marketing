import {
  IsString,
  IsOptional,
  IsObject,
  IsIn,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateFlowDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['manual', 'lead.captured', 'score.updated', 'schedule'])
  trigger?: string;

  @IsOptional()
  @IsObject()
  graph?: Record<string, unknown>;
}
