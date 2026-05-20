import { IsString, IsIn } from 'class-validator';

export class CreateAudienceExportDto {
  @IsString()
  segment: string;

  @IsIn(['lookalike', 'custom'])
  type: string;
}
