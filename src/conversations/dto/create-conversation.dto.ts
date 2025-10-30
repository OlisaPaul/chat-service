import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({
    description: 'Partner external ID for private conversation',
    example: 'appA:user456',
  })
  partnerExternalId: string;
}

export class CreateGroupConversationDto {
  @ApiProperty({
    description: 'Group conversation name',
    example: 'Project Team',
  })
  name: string;

  @ApiProperty({
    description: 'Array of participant external IDs',
    example: ['appA:user123', 'appA:user456', 'appA:user789'],
  })
  participantIds: string[];
}