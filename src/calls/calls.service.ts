import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  getPaginatedData,
  getPaginationResponse,
} from '../common/helper-functions/get-pagination-meta';
import {
  CallParticipant,
  CallParticipantRole,
  CallParticipantStatus,
} from './call-participant.entity';
import { CallResponseDto } from './dto/call-response.dto';
import { CallSession, CallStatus, CallType } from './call-session.entity';

const ACTIVE_CALL_STATUSES = [
  CallStatus.INITIATED,
  CallStatus.RINGING,
  CallStatus.ACCEPTED,
];

const ACTIONABLE_RINGING_CALL_STATUSES = [CallStatus.RINGING];
const SIGNALABLE_CALL_STATUSES = [CallStatus.ACCEPTED];
const TERMINAL_CALL_STATUSES = [
  CallStatus.REJECTED,
  CallStatus.CANCELLED,
  CallStatus.ENDED,
  CallStatus.MISSED,
  CallStatus.FAILED,
];

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(CallSession)
    private readonly callSessionRepository: Repository<CallSession>,
    @InjectRepository(CallParticipant)
    private readonly callParticipantRepository: Repository<CallParticipant>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async createCall(initiator: User, targetUserId: number, type: CallType) {
    this.assertCallsEnabled();

    if (initiator.id === targetUserId) {
      throw new BadRequestException('You cannot start a call with yourself');
    }

    const targetUser = await this.usersRepository.findOne({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    const existingCall = await this.findActiveCallBetweenParticipants(
      initiator.id,
      targetUser.id,
    );
    if (existingCall) {
      throw new BadRequestException(
        `An active call already exists between these participants (call ${existingCall.id})`,
      );
    }

    const session = this.callSessionRepository.create({
      initiator,
      type,
      status: CallStatus.RINGING,
    });
    const savedSession = await this.callSessionRepository.save(session);

    await this.callParticipantRepository.save([
      this.callParticipantRepository.create({
        call: savedSession,
        user: initiator,
        role: CallParticipantRole.CALLER,
        status: CallParticipantStatus.ACCEPTED,
      }),
      this.callParticipantRepository.create({
        call: savedSession,
        user: targetUser,
        role: CallParticipantRole.CALLEE,
        status: CallParticipantStatus.INVITED,
      }),
    ]);

    const call = await this.getCallById(savedSession.id, initiator);
    return new CallResponseDto(call, initiator);
  }

  async getCallById(callId: number, user: User) {
    const participant = await this.callParticipantRepository.findOne({
      where: {
        call: { id: callId },
        user: { id: user.id },
      },
      relations: ['call', 'call.initiator', 'call.participants', 'call.participants.user'],
    });

    if (!participant) {
      throw new NotFoundException('Call not found for user');
    }

    return participant.call;
  }

  async getActiveCall(user: User) {
    const participant = await this.callParticipantRepository.findOne({
      where: {
        user: { id: user.id },
        call: { status: In(ACTIVE_CALL_STATUSES) },
      },
      relations: ['call', 'call.initiator', 'call.participants', 'call.participants.user'],
      order: { call: { updatedAt: 'DESC' } as never },
    });

    return participant ? new CallResponseDto(participant.call, user) : null;
  }

  async getHistory(user: User, paginationDto: PaginationDto) {
    const qb = this.callParticipantRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.call', 'call')
      .leftJoinAndSelect('call.initiator', 'initiator')
      .leftJoinAndSelect('call.participants', 'callParticipants')
      .leftJoinAndSelect('callParticipants.user', 'callParticipantUser')
      .where('participant.user_id = :userId', { userId: user.id })
      .orderBy('call.updatedAt', 'DESC');

    const { data, total } = await getPaginatedData(paginationDto, qb);
    const mapped = data.map((participant) => new CallResponseDto(participant.call, user));

    return getPaginationResponse(paginationDto, qb, mapped, total);
  }

  async acceptCall(callId: number, user: User) {
    const call = await this.getCallById(callId, user);
    this.assertActionableRingingCall(call);

    const participant = call.participants.find((entry) => entry.user.id === user.id);
    if (!participant || participant.role !== CallParticipantRole.CALLEE) {
      throw new ForbiddenException('Only the invited callee can accept a call');
    }
    if (participant.status !== CallParticipantStatus.INVITED) {
      throw new BadRequestException('Call participant cannot accept this call');
    }

    await this.callParticipantRepository.update(participant.id, {
      status: CallParticipantStatus.ACCEPTED,
    });
    await this.callSessionRepository.update(callId, {
      status: CallStatus.ACCEPTED,
      startedAt: new Date(),
    });

    return new CallResponseDto(await this.getCallById(callId, user), user);
  }

  async rejectCall(callId: number, user: User) {
    const call = await this.getCallById(callId, user);
    this.assertActionableRingingCall(call);

    const participant = call.participants.find((entry) => entry.user.id === user.id);
    if (!participant || participant.role !== CallParticipantRole.CALLEE) {
      throw new ForbiddenException('Only the invited callee can reject a call');
    }
    if (participant.status !== CallParticipantStatus.INVITED) {
      throw new BadRequestException('Call participant cannot reject this call');
    }

    await this.callParticipantRepository.update(participant.id, {
      status: CallParticipantStatus.REJECTED,
    });
    await this.callSessionRepository.update(callId, {
      status: CallStatus.REJECTED,
      endedAt: new Date(),
    });

    return new CallResponseDto(await this.getCallById(callId, user), user);
  }

  async cancelCall(callId: number, user: User) {
    const call = await this.getCallById(callId, user);
    if (call.initiator.id !== user.id) {
      throw new ForbiddenException('Only the initiator can cancel a call');
    }

    this.assertActionableRingingCall(call);

    await this.callSessionRepository.update(callId, {
      status: CallStatus.CANCELLED,
      endedAt: new Date(),
    });

    return new CallResponseDto(await this.getCallById(callId, user), user);
  }

  async endCall(callId: number, user: User) {
    const call = await this.getCallById(callId, user);
    if (call.status !== CallStatus.ACCEPTED) {
      throw this.buildNoLongerActionableError(call, 'Only active calls can be ended');
    }

    const participant = call.participants.find((entry) => entry.user.id === user.id);
    if (!participant) {
      throw new NotFoundException('Participant not found for call');
    }

    await this.callParticipantRepository.update(participant.id, {
      status: CallParticipantStatus.LEFT,
    });
    await this.callSessionRepository.update(callId, {
      status: CallStatus.ENDED,
      endedAt: new Date(),
    });

    return new CallResponseDto(await this.getCallById(callId, user), user);
  }

  async handleDisconnect(user: User) {
    const activeCall = await this.findMostRecentActiveCallForUser(user.id);
    if (!activeCall) {
      return null;
    }

    const participant = activeCall.participants.find(
      (entry) => entry.user.id === user.id,
    );
    if (!participant) {
      return null;
    }

    if (activeCall.status === CallStatus.RINGING) {
      const nextStatus =
        participant.role === CallParticipantRole.CALLER
          ? CallStatus.CANCELLED
          : CallStatus.MISSED;
      const nextParticipantStatus =
        participant.role === CallParticipantRole.CALLER
          ? CallParticipantStatus.LEFT
          : CallParticipantStatus.MISSED;

      await this.callParticipantRepository.update(participant.id, {
        status: nextParticipantStatus,
      });
      await this.callSessionRepository.update(activeCall.id, {
        status: nextStatus,
        endedAt: new Date(),
      });

      return new CallResponseDto(await this.getCallById(activeCall.id, user), user);
    }

    if (activeCall.status === CallStatus.ACCEPTED) {
      await this.callParticipantRepository.update(participant.id, {
        status: CallParticipantStatus.LEFT,
      });
      await this.callSessionRepository.update(activeCall.id, {
        status: CallStatus.ENDED,
        endedAt: new Date(),
      });

      return new CallResponseDto(await this.getCallById(activeCall.id, user), user);
    }

    return null;
  }

  async assertParticipant(callId: number, user: User) {
    await this.getCallById(callId, user);
  }

  async assertCanRelaySignal(
    callId: number,
    user: User,
    targetUserExternalId: string,
  ) {
    const call = await this.getCallById(callId, user);

    if (!SIGNALABLE_CALL_STATUSES.includes(call.status)) {
      throw this.buildNoLongerActionableError(
        call,
        'WebRTC signaling is only allowed for accepted calls',
      );
    }

    const sender = call.participants.find((entry) => entry.user.id === user.id);
    if (!sender) {
      throw new ForbiddenException('Only call participants can relay signaling data');
    }

    const target = call.participants.find(
      (entry) => entry.user.externalId === targetUserExternalId,
    );
    if (!target) {
      throw new ForbiddenException('Signal target is not a participant in this call');
    }

    if (target.user.id === user.id) {
      throw new BadRequestException('Cannot relay signaling data to the same participant');
    }

    return new CallResponseDto(call, user);
  }

  async getRtcConfiguration() {
    this.assertCallsEnabled();

    return {
      stunUrls: this.configService.get<string[]>('rtc.stunUrls') ?? [],
      turnUrls: this.configService.get<string[]>('rtc.turnUrls') ?? [],
      turnUsername: this.configService.get<string>('rtc.turnUsername') ?? '',
      turnPassword: this.configService.get<string>('rtc.turnPassword') ?? '',
      iceTransportPolicy:
        this.configService.get<string>('rtc.iceTransportPolicy') ?? 'all',
    };
  }

  private assertCallsEnabled() {
    if (!this.configService.get<boolean>('features.calls')) {
      throw new ServiceUnavailableException('Calling is disabled');
    }
  }

  private assertActionableRingingCall(call: CallSession) {
    if (!ACTIONABLE_RINGING_CALL_STATUSES.includes(call.status)) {
      throw this.buildNoLongerActionableError(
        call,
        'Call is not in a ringable state',
      );
    }
  }

  private buildNoLongerActionableError(call: CallSession, fallbackMessage: string) {
    if (TERMINAL_CALL_STATUSES.includes(call.status)) {
      return new BadRequestException(
        `Call is no longer actionable because it is ${call.status}`,
      );
    }

    return new BadRequestException(fallbackMessage);
  }

  private async findMostRecentActiveCallForUser(userId: number) {
    const participant = await this.callParticipantRepository.findOne({
      where: {
        user: { id: userId },
        call: { status: In(ACTIVE_CALL_STATUSES) },
      },
      relations: ['call', 'call.initiator', 'call.participants', 'call.participants.user'],
      order: { call: { updatedAt: 'DESC' } as never },
    });

    return participant?.call ?? null;
  }

  private async findActiveCallBetweenParticipants(userAId: number, userBId: number) {
    const activeStatuses = ACTIVE_CALL_STATUSES;

    const call = await this.callSessionRepository
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.initiator', 'initiator')
      .leftJoinAndSelect('call.participants', 'participant')
      .leftJoinAndSelect('participant.user', 'participantUser')
      .where('call.status IN (:...activeStatuses)', { activeStatuses })
      .andWhere((qb) => {
        const subQueryA = qb
          .subQuery()
          .select('1')
          .from(CallParticipant, 'participantA')
          .where('participantA.call_session_id = call.id')
          .andWhere('participantA.user_id = :userAId')
          .getQuery();

        const subQueryB = qb
          .subQuery()
          .select('1')
          .from(CallParticipant, 'participantB')
          .where('participantB.call_session_id = call.id')
          .andWhere('participantB.user_id = :userBId')
          .getQuery();

        return `EXISTS ${subQueryA} AND EXISTS ${subQueryB}`;
      })
      .setParameters({ userAId, userBId })
      .orderBy('call.updatedAt', 'DESC')
      .getOne();

    return call ?? null;
  }
}
