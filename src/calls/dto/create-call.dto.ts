import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min, ValidateIf } from 'class-validator';
import { CallType } from '../call-session.entity';

export class CreateCallDto {
  @ApiProperty({
    example: 2,
    description: 'Target user ID for private/1:1 calls',
    required: false,
  })
  @ValidateIf((value) => !value.conversationId)
  @IsInt()
  @Min(1)
  targetUserId?: number;

  @ApiProperty({
    example: 12,
    description: 'Group conversation ID for group calls',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  conversationId?: number;

  @ApiProperty({ enum: CallType, example: CallType.VIDEO })
  @IsEnum(CallType)
  type: CallType;
}
