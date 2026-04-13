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
import { Conversation } from '../entities/conversation.entity';

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
  overrides: Partial<CallSession> = {},
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
    ...overrides,
  } as CallSession;
}

describe('CallsService', () => {
  let service: CallsService;
  let callSessionRepository: MockRepository<CallSession>;
  let callParticipantRepository: MockRepository<CallParticipant>;
  let usersRepository: MockRepository<User>;
  let conversationsRepository: MockRepository<Conversation>;
  let configService: ConfigService;

  const caller = createUser(1, 'appA:alice', 'Alice');
  const callee = createUser(2, 'appA:bob', 'Bob');
  const charlie = createUser(3, 'appA:charlie', 'Charlie');

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
    conversationsRepository = {
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
      conversationsRepository as Repository<Conversation>,
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

  it('creates a group call from a group conversation and invites all other members', async () => {
    const groupConversation = {
      id: 44,
      type: 'group',
      name: 'Test group',
      participants: [
        { user: caller, role: 'admin' },
        { user: callee, role: 'member' },
        { user: charlie, role: 'member' },
      ],
    } as unknown as Conversation;
    const createdSession = {
      id: 45,
      initiator: caller,
      conversation: groupConversation,
      type: CallType.VIDEO,
      status: CallStatus.RINGING,
    } as CallSession;
    const groupCall = {
      id: 45,
      initiator: caller,
      conversation: groupConversation,
      type: CallType.VIDEO,
      status: CallStatus.RINGING,
      participants: [
        {
          id: 1,
          user: caller,
          role: CallParticipantRole.CALLER,
          status: CallParticipantStatus.ACCEPTED,
        },
        {
          id: 2,
          user: callee,
          role: CallParticipantRole.CALLEE,
          status: CallParticipantStatus.INVITED,
        },
        {
          id: 3,
          user: charlie,
          role: CallParticipantRole.CALLEE,
          status: CallParticipantStatus.INVITED,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      endedAt: null,
    } as CallSession;

    (conversationsRepository.findOne as jest.Mock).mockResolvedValue(groupConversation);
    (callSessionRepository.findOne as jest.Mock).mockResolvedValue(null);
    (callSessionRepository.create as jest.Mock).mockReturnValue(createdSession);
    (callSessionRepository.save as jest.Mock).mockResolvedValue(createdSession);
    (callParticipantRepository.create as jest.Mock).mockImplementation((value) => value);
    (callParticipantRepository.save as jest.Mock).mockResolvedValue(undefined);
    (callParticipantRepository.findOne as jest.Mock).mockResolvedValue({
      call: groupCall,
    });

    const result = await service.createCall(
      caller,
      undefined,
      CallType.VIDEO,
      groupConversation.id,
    );

    expect(conversationsRepository.findOne).toHaveBeenCalledWith({
      where: { id: groupConversation.id },
      relations: ['participants', 'participants.user'],
    });
    expect(callParticipantRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          user: caller,
          role: CallParticipantRole.CALLER,
          status: CallParticipantStatus.ACCEPTED,
        }),
        expect.objectContaining({
          user: callee,
          role: CallParticipantRole.CALLEE,
          status: CallParticipantStatus.INVITED,
        }),
        expect.objectContaining({
          user: charlie,
          role: CallParticipantRole.CALLEE,
          status: CallParticipantStatus.INVITED,
        }),
      ]),
    );
    expect(result.scope).toBe('group');
    expect(result.conversationId).toBe(groupConversation.id);
    expect(result.participants).toHaveLength(3);
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

  it('rejects accepting a call that is already ended', async () => {
    const call = createCall(22, caller, callee, CallStatus.ENDED);
    (callParticipantRepository.findOne as jest.Mock).mockResolvedValue({ call });

    await expect(service.acceptCall(call.id, callee)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects rejecting a call that is already accepted', async () => {
    const call = createCall(23, caller, callee, CallStatus.ACCEPTED);
    (callParticipantRepository.findOne as jest.Mock).mockResolvedValue({ call });

    await expect(service.rejectCall(call.id, callee)).rejects.toBeInstanceOf(
      BadRequestException,
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

  it('marks a ringing call as missed when the callee disconnects', async () => {
    const ringingCall = createCall(31, caller, callee, CallStatus.RINGING);
    (callParticipantRepository.findOne as jest.Mock)
      .mockResolvedValueOnce({ call: ringingCall })
      .mockResolvedValueOnce({
        call: createCall(31, caller, callee, CallStatus.MISSED, {
          endedAt: new Date(),
        }),
      });

    const result = await service.handleDisconnect(callee);

    expect(callParticipantRepository.update).toHaveBeenCalledWith(2, {
      status: CallParticipantStatus.MISSED,
    });
    expect(callSessionRepository.update).toHaveBeenCalledWith(31, {
      status: CallStatus.MISSED,
      endedAt: expect.any(Date),
    });
    expect(result?.status).toBe(CallStatus.MISSED);
  });

  it('marks an active call as ended when a participant disconnects', async () => {
    const activeCall = createCall(32, caller, callee, CallStatus.ACCEPTED);
    (callParticipantRepository.findOne as jest.Mock)
      .mockResolvedValueOnce({ call: activeCall })
      .mockResolvedValueOnce({
        call: createCall(32, caller, callee, CallStatus.ENDED, {
          endedAt: new Date(),
        }),
      });

    const result = await service.handleDisconnect(caller);

    expect(callParticipantRepository.update).toHaveBeenCalledWith(1, {
      status: CallParticipantStatus.LEFT,
    });
    expect(callSessionRepository.update).toHaveBeenCalledWith(32, {
      status: CallStatus.ENDED,
      endedAt: expect.any(Date),
    });
    expect(result?.status).toBe(CallStatus.ENDED);
  });

  it('only allows signaling for accepted calls and real participants', async () => {
    const activeCall = createCall(33, caller, callee, CallStatus.ACCEPTED);
    (callParticipantRepository.findOne as jest.Mock).mockResolvedValue({
      call: activeCall,
    });

    const result = await service.assertCanRelaySignal(
      activeCall.id,
      caller,
      callee.externalId,
    );

    expect(result.id).toBe(33);
    expect(result.initiator.externalId).toBe(caller.externalId);
    expect(result.media.hasVideo).toBe(false);
  });

  it('blocks signaling for ended calls', async () => {
    const endedCall = createCall(34, caller, callee, CallStatus.ENDED);
    (callParticipantRepository.findOne as jest.Mock).mockResolvedValue({
      call: endedCall,
    });

    await expect(
      service.assertCanRelaySignal(endedCall.id, caller, callee.externalId),
    ).rejects.toBeInstanceOf(BadRequestException);
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
