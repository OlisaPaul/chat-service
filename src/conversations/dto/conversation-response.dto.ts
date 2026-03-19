import { ApiProperty } from '@nestjs/swagger';

class ConversationParticipantResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'External user ID',
    example: 'appA:user123',
  })
  externalId: string;

  @ApiProperty({
    description: 'User display name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User avatar URL',
    required: false,
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'Participant role within the conversation',
    enum: ['admin', 'member'],
    example: 'member',
  })
  role: string;
}

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Conversation type',
    enum: ['private', 'group'],
    example: 'group',
  })
  type: string;

  @ApiProperty({
    description: 'Conversation name for group chats',
    required: false,
    example: 'Project Team',
  })
  name?: string;

  @ApiProperty({
    description: 'Conversation participants',
    type: [ConversationParticipantResponseDto],
  })
  participants: ConversationParticipantResponseDto[];

  @ApiProperty({
    description: 'Last message in conversation',
    required: false,
    example: {
      id: 1,
      content: 'Hello!',
      senderName: 'John Doe',
      sentByMe: false,
      status: 'delivered',
      createdAt: '2023-01-01T00:00:00.000Z',
    },
  })
  lastMessage?: any;

  @ApiProperty({
    description: 'Conversation creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
