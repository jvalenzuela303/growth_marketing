import {
  IsUUID,
  IsDateString,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  leadId: string;

  @IsDateString()
  scheduledAt: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  durationMins?: number = 30;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsOptional()
  meetingUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
