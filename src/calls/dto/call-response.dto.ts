import { ApiProperty } from '@nestjs/swagger';
import { CallParticipantStatus, CallParticipantRole } from '../call-participant.entity';
import { CallSession, CallStatus, CallType } from '../call-session.entity';
import { User } from '../../entities/user.entity';

class CallParticipantDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  externalId: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CallParticipantRole })
  role: CallParticipantRole;

  @ApiProperty({ enum: CallParticipantStatus })
  status: CallParticipantStatus;
}

export class CallResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: CallType })
  type: CallType;

  @ApiProperty({ enum: CallStatus })
  status: CallStatus;

  @ApiProperty()
  initiatorId: number;

  @ApiProperty({ type: [CallParticipantDto] })
  participants: CallParticipantDto[];

  @ApiProperty({ required: false, nullable: true })
  startedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  endedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(call: CallSession, currentUser?: User) {
    this.id = call.id;
    this.type = call.type;
    this.status = call.status;
    this.initiatorId = call.initiator.id;
    this.startedAt = call.startedAt;
    this.endedAt = call.endedAt;
    this.createdAt = call.createdAt;
    this.updatedAt = call.updatedAt;
    this.participants = (call.participants || []).map((participant) => ({
      userId: participant.user.id,
      externalId: participant.user.externalId,
      name: participant.user.name,
      role: participant.role,
      status: participant.status,
    }));
  }
}
