import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsArray,
} from 'class-validator';

export class UpdateLeadDto {
  @IsOptional()
  @IsIn([
    'nuevo',
    'calificado',
    'contactado',
    'propuesta',
    'negociacion',
    'cerrado_ganado',
    'cerrado_perdido',
  ])
  pipelineStage?: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
