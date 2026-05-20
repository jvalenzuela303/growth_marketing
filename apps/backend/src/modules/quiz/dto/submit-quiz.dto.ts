import {
  IsString,
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsEmail,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class QuizAnswerDto {
  @IsString()
  questionId: string;

  @IsNumber()
  questionIndex: number;

  @IsOptional()
  @IsString()
  optionId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionIds?: string[];

  @IsOptional()
  @IsString()
  textValue?: string;

  @IsOptional()
  @IsNumber()
  numberValue?: number;
}

class LeadGateDataDto {
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;
}

class QuizMetadataDto {
  @IsOptional()
  @IsString()
  utmSource?: string;

  @IsOptional()
  @IsString()
  utmMedium?: string;

  @IsOptional()
  @IsString()
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  fbclid?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];

  @ValidateNested()
  @Type(() => LeadGateDataDto)
  leadData: LeadGateDataDto;

  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercentage: number;

  @IsString()
  sessionId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuizMetadataDto)
  metadata?: QuizMetadataDto;
}
