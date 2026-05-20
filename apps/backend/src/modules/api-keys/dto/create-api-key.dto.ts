import { IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Nombre descriptivo de la API key', example: 'Integración CRM' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Scopes de acceso',
    example: ['leads:read', 'leads:write', 'funnels:read'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  scopes?: string[];
}
