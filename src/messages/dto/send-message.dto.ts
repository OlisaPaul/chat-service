import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content (optional if media is provided)',
    required: false,
    example: 'Hello, world!',
  })
  content?: string;

  @ApiProperty({
    description: 'Media URL (optional if content is provided)',
    required: false,
    example: '/assets/chat/uploads/file-123.mp4',
  })
  mediaUrl?: string;

  @ApiProperty({
    description: 'Media type',
    required: false,
    enum: ['image', 'video', 'document'],
    example: 'video',
  })
  mediaType?: string;
}