import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsIn(['admin', 'member', 'viewer'])
  role: 'admin' | 'member' | 'viewer' = 'member';
}
