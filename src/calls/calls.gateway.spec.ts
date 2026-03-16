import { CallsGateway } from './calls.gateway';
import { CallsService } from './calls.service';
import { AuthIdentityService } from '../auth/auth-identity.service';
import { CallStatus, CallType } from './call-session.entity';
import { PresenceStateService } from '../presence/presence-state.service';

describe('CallsGateway', () => {
  let gateway: CallsGateway;
  let callsService: jest.Mocked<CallsService>;
  let authIdentityService: jest.Mocked<AuthIdentityService>;
  let presenceStateService: jest.Mocked<PresenceStateService>;
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
    initiator: {
      userId: 1,
      externalId: 'appA:alice',
      name: 'Alice',
    },
    media: {
      hasAudio: true,
      hasVideo: false,
    },
    participants: [
      {
        userId: 1,
        externalId: 'appA:alice',
        name: 'Alice',
        role: 'caller',
        status: 'accepted',
        mediaIntent: {
          sendAudio: true,
          sendVideo: false,
          receiveAudio: true,
          receiveVideo: false,
        },
      },
      {
        userId: 2,
        externalId: 'appA:bob',
        name: 'Bob',
        role: 'callee',
        status: 'invited',
        mediaIntent: {
          sendAudio: true,
          sendVideo: false,
          receiveAudio: true,
          receiveVideo: false,
        },
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
      assertCanRelaySignal: jest.fn(),
      handleDisconnect: jest.fn(),
    } as unknown as jest.Mocked<CallsService>;

    authIdentityService = {
      authenticateSocket: jest.fn(),
    } as unknown as jest.Mocked<AuthIdentityService>;

    presenceStateService = {
      hasOtherActiveSockets: jest.fn(),
    } as unknown as jest.Mocked<PresenceStateService>;

    gateway = new CallsGateway(
      authIdentityService,
      callsService,
      presenceStateService,
    );
    server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    gateway.server = server;

    socket = {
      id: 'socket-1',
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
    expect(server.to).toHaveBeenCalledWith('user:appA:alice');
    expect(server.to).toHaveBeenCalledWith('user:appA:bob');
    expect(server.emit).toHaveBeenCalledWith('incoming_call', callDto);
    expect(result).toBe(callDto);
  });

  it('relays answers only for valid participants', async () => {
    callsService.assertCanRelaySignal.mockResolvedValue(callDto as any);

    await gateway.handleAnswer(
      { callId: 1, targetUserExternalId: 'appA:bob', sdp: { type: 'answer' } },
      socket,
    );

    expect(callsService.assertCanRelaySignal).toHaveBeenCalledWith(
      1,
      alice,
      'appA:bob',
    );
    expect(server.emit).toHaveBeenCalledWith('webrtc_answer', {
      callId: 1,
      fromUserExternalId: 'appA:alice',
      sdp: { type: 'answer' },
    });
  });

  it('does not end a call when the user still has another active socket', async () => {
    presenceStateService.hasOtherActiveSockets.mockReturnValue(true);

    await gateway.handleDisconnect(socket);

    expect(callsService.handleDisconnect).not.toHaveBeenCalled();
  });
});
