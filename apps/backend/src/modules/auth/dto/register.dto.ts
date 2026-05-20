import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  tenantName: string;

  /**
   * Slug único del tenant: solo letras minúsculas, números y guiones.
   * Ejemplo: "acme-corp", "mi-negocio-2024"
   */
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'tenantSlug debe contener solo letras minúsculas, números y guiones.',
  })
  @MaxLength(100)
  tenantSlug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt max
  password: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
