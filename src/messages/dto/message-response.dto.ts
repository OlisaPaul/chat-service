import { Message, MessageStatus } from '../message.entity';
import { User } from '../../entities/user.entity';

import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Message content',
    required: false,
    example: 'Hello, world!',
  })
  content?: string;

  @ApiProperty({
    description: 'Media URL for images, videos, or documents',
    required: false,
    example: '/assets/chat/uploads/file-123.mp4',
  })
  mediaUrl?: string;

  @ApiProperty({
    description: 'Type of media',
    required: false,
    enum: ['image', 'video', 'document'],
    example: 'video',
  })
  mediaType?: string;

  @ApiProperty({
    description: 'Sender display name',
    example: 'John Doe',
  })
  senderName: string;

  @ApiProperty({
    description: 'Whether this message was sent by the current user',
    example: false,
  })
  sentByMe: boolean;

  @ApiProperty({
    description: 'Message delivery status',
    enum: ['sent', 'delivered', 'read'],
    example: 'delivered',
  })
  status: string;

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Conversation ID',
    example: 1,
  })
  conversationId: number;

  constructor(message: any, currentUser: any) {
    this.id = message.id;
    this.content = message.content;
    this.mediaUrl = message.mediaUrl;
    this.mediaType = message.mediaType;
    this.senderName = message.sender?.name ?? 'Unknown';
    this.sentByMe = message.sender?.id === currentUser.id;
    this.status = message.status;
    this.createdAt = message.createdAt;
    this.conversationId = message.conversation?.id;
  }
}