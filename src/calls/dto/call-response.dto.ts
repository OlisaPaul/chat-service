import { ApiProperty } from '@nestjs/swagger';
import { CallParticipantStatus, CallParticipantRole } from '../call-participant.entity';
import { CallSession, CallStatus, CallType } from '../call-session.entity';
import { User } from '../../entities/user.entity';

class CallMediaIntentDto {
  @ApiProperty()
  sendAudio: boolean;

  @ApiProperty()
  sendVideo: boolean;

  @ApiProperty()
  receiveAudio: boolean;

  @ApiProperty()
  receiveVideo: boolean;
}

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

  @ApiProperty({ type: CallMediaIntentDto })
  mediaIntent: CallMediaIntentDto;
}

class CallInitiatorDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  externalId: string;

  @ApiProperty()
  name: string;
}

class CallMediaDto {
  @ApiProperty()
  hasAudio: boolean;

  @ApiProperty()
  hasVideo: boolean;
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

  @ApiProperty({ type: CallInitiatorDto })
  initiator: CallInitiatorDto;

  @ApiProperty({ type: [CallParticipantDto] })
  participants: CallParticipantDto[];

  @ApiProperty({ type: CallMediaDto })
  media: CallMediaDto;

  @ApiProperty({ required: false, nullable: true })
  startedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  endedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(call: CallSession, currentUser?: User) {
    const sendVideo = call.type === CallType.VIDEO;

    this.id = call.id;
    this.type = call.type;
    this.status = call.status;
    this.initiatorId = call.initiator.id;
    this.initiator = {
      userId: call.initiator.id,
      externalId: call.initiator.externalId,
      name: call.initiator.name,
    };
    this.startedAt = call.startedAt;
    this.endedAt = call.endedAt;
    this.createdAt = call.createdAt;
    this.updatedAt = call.updatedAt;
    this.media = {
      hasAudio: true,
      hasVideo: sendVideo,
    };
    this.participants = (call.participants || []).map((participant) => ({
      userId: participant.user.id,
      externalId: participant.user.externalId,
      name: participant.user.name,
      role: participant.role,
      status: participant.status,
      mediaIntent: {
        sendAudio: true,
        sendVideo,
        receiveAudio: true,
        receiveVideo: sendVideo,
      },
    }));
  }
}
