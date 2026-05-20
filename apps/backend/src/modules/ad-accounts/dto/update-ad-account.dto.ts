import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';

export class UpdateAdAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'disconnected'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
