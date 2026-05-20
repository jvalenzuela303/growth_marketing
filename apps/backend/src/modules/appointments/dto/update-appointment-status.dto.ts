import { IsIn } from 'class-validator';

export class UpdateAppointmentStatusDto {
  @IsIn(['scheduled', 'completed', 'cancelled', 'no_show'])
  status: string;
}
