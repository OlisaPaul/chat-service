import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { CallType } from '../call-session.entity';

export class CreateCallDto {
  @ApiProperty({ example: 2, description: 'Target user ID' })
  @IsInt()
  @Min(1)
  targetUserId: number;

  @ApiProperty({ enum: CallType, example: CallType.VIDEO })
  @IsEnum(CallType)
  type: CallType;
}
