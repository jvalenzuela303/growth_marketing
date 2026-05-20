import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateAdAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsIn(['meta', 'google', 'tiktok', 'linkedin'])
  platform: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalAccountId: string;

  @IsOptional()
  @IsString()
  accessToken?: string;
}
