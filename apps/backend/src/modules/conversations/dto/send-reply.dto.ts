import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class SendReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsString()
  @IsOptional()
  channel?: string;
}
