import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  /**
   * owner no puede cambiarse via este endpoint.
   * Solo admin/member/viewer son valores válidos.
   */
  @IsOptional()
  @IsIn(['admin', 'member', 'viewer'])
  role?: 'admin' | 'member' | 'viewer';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
