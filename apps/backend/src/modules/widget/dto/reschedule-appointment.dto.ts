import { IsDateString, IsEmail } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsDateString()
  newDate: string;

  @IsEmail()
  email: string;
}
