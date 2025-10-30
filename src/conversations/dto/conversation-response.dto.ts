import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Conversation ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Conversation participants',
    type: [UserResponseDto],
  })
  participants: UserResponseDto[];

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