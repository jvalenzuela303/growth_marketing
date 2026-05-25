import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatHistoryEntryDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content: string;
}

export class WidgetChatDto {
  @IsString()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryEntryDto)
  history?: ChatHistoryEntryDto[];
}
