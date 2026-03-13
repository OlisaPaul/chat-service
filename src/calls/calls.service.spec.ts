import {
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CallsService } from './calls.service';
import {
  CallParticipant,
  CallParticipantRole,
  CallParticipantStatus,
} from './call-participant.entity';
import { CallSession, CallStatus, CallType } from './call-session.entity';
import { User } from '../entities/user.entity';

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function createUser(id: number, externalId: string, name: string): User {
  return {
    id,
    externalId,
    name,
    createdAt: new Date(),
  } as User;
}

function createCall(
  id: number,
  initiator: User,
  callee: User,
  status: CallStatus,
): CallSession {
  return {
    id,
    type: CallType.AUDIO,
    status,
    initiator,
    participants: [
      {
        id: 1,
        user: initiator,
        role: CallParticipantRole.CALLER,
        status:
          status === CallStatus.RINGING
            ? CallParticipantStatus.ACCEPTED
            : CallParticipantStatus.ACCEPTED,
      } as CallParticipant,
      {
        id: 2,
        user: callee,
        role: CallParticipantRole.CALLEE,
        status:
          status === CallStatus.RINGING
            ? CallParticipantStatus.INVITED
            : CallParticipantStatus.ACCEPTED,
      } as CallParticipant,
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: null,
    endedAt: null,
  } as CallSession;
}

describe('CallsService', () => {
  let service: CallsService;
  let callSessionRepository: MockRepository<CallSession>;
  let callParticipantRepository: MockRepository<CallParticipant>;
  let usersRepository: MockRepository<User>;
  let configService: ConfigService;

  const caller = createUser(1, 'appA:alice', 'Alice');
  const callee = createUser(2, 'appA:bob', 'Bob');

  beforeEach(() => {
    callSessionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    callParticipantRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    usersRepository = {
      findOne: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'features.calls') return true;
        if (key === 'rtc.stunUrls') return ['stun:stun.l.google.com:19302'];
        if (key === 'rtc.turnUrls') return [];
        if (key === 'rtc.turnUsername') return '';
        if (key === 'rtc.turnPassword') return '';
        if (key === 'rtc.iceTransportPolicy') return 'all';
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new CallsService(
      callSessionRepository as Repository<CallSession>,
      callParticipantRepository as Repository<CallParticipant>,
      usersRepository as Repository<User>,
      configService,
    );
  });

  function mockActiveCallLookup(result: CallSession | null) {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(result),
      subQuery: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getQuery: jest.fn().mockReturnValue('(SELECT 1)'),
      }),
    };
    (callSessionRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
  }

  it('creates a new ringing call when there is no active duplicate', async () => {
    mockActiveCallLookup(null);
    (usersRepository.findOne as jest.Mock).mockResolvedValue(callee);
    const pendingCall = { initiator: caller, type: CallType.AUDIO, status: CallStatus.RINGING };
    const createdSession = { id: 10, ...pendingCall } as CallSession;
    (callSessionRepository.create as jest.Mock).mockReturnValue(pendingCall);
    (callSessionRepository.save as jest.Mock).mockResolvedValue(createdSession);
    (callParticipantRepository.create as jest.Mock).mockImplementation((value) => value);
    (callParticipantRepository.save as jest.Mock).mockResolvedValue(undefined);
    (callParticipantRepository.findOne as jest.Mock).mockResolvedValue({
      call: createCall(10, caller, callee, CallStatus.RINGING),
    });

    const result = await service.createCall(caller, callee.id, CallType.AUDIO);

    expect(callSessionRepository.save).toHaveBeenCalled();
    expect(callParticipantRepository.save).toHaveBeenCalled();
    expect(result.id).toBe(10);
    expect(result.status).toBe(CallStatus.RINGING);
  });

  it('prevents duplicate active calls between the same participants', async () => {
    mockActiveCallLookup(createCall(99, caller, callee, CallStatus.RINGING));
    (usersRepository.findOne as jest.Mock).mockResolvedValue(callee);

    await expect(
      service.createCall(caller, callee.id, CallType.AUDIO),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a ringing call only for the invited callee', async () => {
    const call = createCall(20, caller, callee, CallStatus.RINGING);
    (callParticipantRepository.findOne as jest.Mock)
      .mockResolvedValueOnce({ call })
      .mockResolvedValueOnce({
        call: { ...call, status: CallStatus.ACCEPTED, startedAt: new Date() },
      });

    const result = await service.acceptCall(call.id, callee);

    expect(callParticipantRepository.update).toHaveBeenCalledWith(2, {
      status: CallParticipantStatus.ACCEPTED,
    });
    expect(callSessionRepository.update).toHaveBeenCalled();
    expect(result.status).toBe(CallStatus.ACCEPTED);
  });

  it('rejects caller acceptance attempts', async () => {
    const call = createCall(21, caller, callee, CallStatus.RINGING);
    (callParticipantRepository.findOne as jest.Mock).mockResolvedValue({ call });

    await expect(service.acceptCall(call.id, caller)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('ends accepted calls and marks the participant as left', async () => {
    const acceptedCall = createCall(30, caller, callee, CallStatus.ACCEPTED);
    (callParticipantRepository.findOne as jest.Mock)
      .mockResolvedValueOnce({ call: acceptedCall })
      .mockResolvedValueOnce({
        call: { ...acceptedCall, status: CallStatus.ENDED, endedAt: new Date() },
      });

    const result = await service.endCall(acceptedCall.id, caller);

    expect(callParticipantRepository.update).toHaveBeenCalledWith(1, {
      status: CallParticipantStatus.LEFT,
    });
    expect(callSessionRepository.update).toHaveBeenCalled();
    expect(result.status).toBe(CallStatus.ENDED);
  });

  it('returns RTC configuration for the reference client', async () => {
    await expect(service.getRtcConfiguration()).resolves.toEqual({
      stunUrls: ['stun:stun.l.google.com:19302'],
      turnUrls: [],
      turnUsername: '',
      turnPassword: '',
      iceTransportPolicy: 'all',
    });
  });

  it('fails when calling is disabled', async () => {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'features.calls') return false;
      return undefined;
    });

    await expect(service.getRtcConfiguration()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
