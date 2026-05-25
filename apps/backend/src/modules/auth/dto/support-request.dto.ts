import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SupportRequestDto {
  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  issue: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}
