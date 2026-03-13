import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content (optional if media is provided)',
    required: false,
    example: 'Hello, world!',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Media URL (optional if content is provided)',
    required: false,
    example: '/assets/chat/uploads/file-123.mp4',
  })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  mediaUrl?: string;

  @ApiProperty({
    description: 'Media type',
    required: false,
    enum: ['image', 'video', 'document'],
    example: 'video',
  })
  @IsOptional()
  @IsIn(['image', 'video', 'audio', 'document'])
  mediaType?: string;
}
