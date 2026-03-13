import { CallsGateway } from './calls.gateway';
import { CallsService } from './calls.service';
import { AuthIdentityService } from '../auth/auth-identity.service';
import { CallStatus, CallType } from './call-session.entity';

describe('CallsGateway', () => {
  let gateway: CallsGateway;
  let callsService: jest.Mocked<CallsService>;
  let authIdentityService: jest.Mocked<AuthIdentityService>;
  let socket: any;
  let server: any;

  const alice = {
    id: 1,
    externalId: 'appA:alice',
    name: 'Alice',
  } as any;

  const callDto = {
    id: 1,
    type: CallType.AUDIO,
    status: CallStatus.RINGING,
    initiatorId: 1,
    participants: [
      {
        userId: 1,
        externalId: 'appA:alice',
        name: 'Alice',
        role: 'caller',
        status: 'accepted',
      },
      {
        userId: 2,
        externalId: 'appA:bob',
        name: 'Bob',
        role: 'callee',
        status: 'invited',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: null,
    endedAt: null,
  };

  beforeEach(() => {
    callsService = {
      createCall: jest.fn(),
      acceptCall: jest.fn(),
      rejectCall: jest.fn(),
      cancelCall: jest.fn(),
      endCall: jest.fn(),
      assertParticipant: jest.fn(),
      handleDisconnect: jest.fn(),
    } as unknown as jest.Mocked<CallsService>;

    authIdentityService = {
      authenticateSocket: jest.fn(),
    } as unknown as jest.Mocked<AuthIdentityService>;

    gateway = new CallsGateway(authIdentityService, callsService);
    server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    gateway.server = server;

    socket = {
      data: { user: alice },
      join: jest.fn(),
      disconnect: jest.fn(),
    };
  });

  it('authenticates sockets and joins a user room', async () => {
    authIdentityService.authenticateSocket.mockResolvedValue({
      user: alice,
      payload: {},
    });

    await gateway.handleConnection(socket);

    expect(socket.join).toHaveBeenCalledWith('user:appA:alice');
  });

  it('disconnects unauthorized sockets', async () => {
    authIdentityService.authenticateSocket.mockRejectedValue(new Error('nope'));

    await gateway.handleConnection(socket);

    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('emits incoming_call to both participants when a call starts', async () => {
    callsService.createCall.mockResolvedValue(callDto as any);

    const result = await gateway.handleStartCall(
      { targetUserId: 2, type: CallType.AUDIO },
      socket,
    );

    expect(callsService.createCall).toHaveBeenCalledWith(alice, 2, CallType.AUDIO);
    expect(server.emit).toHaveBeenCalledWith('incoming_call', callDto);
    expect(result).toBe(callDto);
  });

  it('relays answers only for valid participants', async () => {
    await gateway.handleAnswer(
      { callId: 1, targetUserExternalId: 'appA:bob', sdp: { type: 'answer' } },
      socket,
    );

    expect(callsService.assertParticipant).toHaveBeenCalledWith(1, alice);
    expect(server.emit).toHaveBeenCalledWith('webrtc_answer', {
      callId: 1,
      fromUserExternalId: 'appA:alice',
      sdp: { type: 'answer' },
    });
  });
});
