import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class ChatMessageDto {
  @IsUUID()
  leadId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @IsString()
  @IsOptional()
  channel?: string = 'chat';
}
