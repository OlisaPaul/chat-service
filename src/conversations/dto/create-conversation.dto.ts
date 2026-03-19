import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

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
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({
    description: 'Array of participant external IDs',
    example: ['appA:user123', 'appA:user456', 'appA:user789'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantIds: string[];
}

export class UpdateGroupMembersDto {
  @ApiProperty({
    description: 'Array of participant external IDs to add',
    example: ['appA:user789'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participantIds: string[];
}

export class LeaveGroupConversationDto {
  @ApiProperty({
    description: 'Optional reason for client bookkeeping',
    required: false,
    example: 'left',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
