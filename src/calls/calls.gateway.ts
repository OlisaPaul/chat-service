import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { User } from '../entities/user.entity';
import { AuthIdentityService } from '../auth/auth-identity.service';
import { CallsService } from './calls.service';
import { CreateCallDto } from './dto/create-call.dto';
import { CallResponseDto } from './dto/call-response.dto';
import { PresenceStateService } from '../presence/presence-state.service';
import { socketGatewayOptions } from '../common/socket-gateway-options';
import { CallStatus } from './call-session.entity';

const TERMINAL_CALL_STATUSES = [
  CallStatus.REJECTED,
  CallStatus.CANCELLED,
  CallStatus.ENDED,
  CallStatus.MISSED,
  CallStatus.FAILED,
];

@WebSocketGateway(socketGatewayOptions)
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(CallsGateway.name);

  constructor(
    private readonly authIdentityService: AuthIdentityService,
    private readonly callsService: CallsService,
    private readonly presenceStateService: PresenceStateService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const { user } = await this.authIdentityService.authenticateSocket(socket);
      socket.join(`user:${user.externalId}`);
    } catch (error) {
      this.logger.warn(`Socket authentication failed for ${socket.id}`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const user = socket.data.user as User | undefined;
    if (!user) {
      return;
    }

    if (
      await this.presenceStateService.hasOtherActiveSockets(
        user.externalId,
        socket.id,
      )
    ) {
      return;
    }

    try {
      const updatedCall = await this.callsService.handleDisconnect(user);
      if (updatedCall) {
        this.emitCallUpdate('call_state_changed', updatedCall);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to handle call disconnect for ${user.externalId}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return;
    }
  }

  @SubscribeMessage('start_call')
  async handleStartCall(
    @MessageBody() payload: CreateCallDto,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    const call = await this.callsService.createCall(
      user,
      payload.targetUserId,
      payload.type,
      payload.conversationId,
    );

    socket.join(`call:${call.id}`);
    this.emitCallToParticipants('incoming_call', call);

    return call;
  }

  @SubscribeMessage('accept_call')
  async handleAcceptCall(
    @MessageBody() payload: { callId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    const call = await this.callsService.acceptCall(payload.callId, user);
    socket.join(`call:${call.id}`);
    this.emitCallUpdate('call_answered', call);
    return call;
  }

  @SubscribeMessage('reject_call')
  async handleRejectCall(
    @MessageBody() payload: { callId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    const call = await this.callsService.rejectCall(payload.callId, user);
    this.emitCallUpdate(
      this.isTerminalCall(call) ? 'call_rejected' : 'call_state_changed',
      call,
    );
    return call;
  }

  @SubscribeMessage('cancel_call')
  async handleCancelCall(
    @MessageBody() payload: { callId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    const call = await this.callsService.cancelCall(payload.callId, user);
    this.emitCallUpdate('call_cancelled', call);
    return call;
  }

  @SubscribeMessage('end_call')
  async handleEndCall(
    @MessageBody() payload: { callId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    const call = await this.callsService.endCall(payload.callId, user);
    this.emitCallUpdate(
      this.isTerminalCall(call) ? 'call_ended' : 'call_state_changed',
      call,
    );
    return call;
  }

  @SubscribeMessage('webrtc_offer')
  async handleOffer(
    @MessageBody()
    payload: { callId: number; targetUserExternalId: string; sdp: unknown },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    await this.callsService.assertCanRelaySignal(
      payload.callId,
      user,
      payload.targetUserExternalId,
    );
    this.server.to(`user:${payload.targetUserExternalId}`).emit('webrtc_offer', {
      callId: payload.callId,
      fromUserExternalId: user.externalId,
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage('webrtc_answer')
  async handleAnswer(
    @MessageBody()
    payload: { callId: number; targetUserExternalId: string; sdp: unknown },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    await this.callsService.assertCanRelaySignal(
      payload.callId,
      user,
      payload.targetUserExternalId,
    );
    this.server.to(`user:${payload.targetUserExternalId}`).emit('webrtc_answer', {
      callId: payload.callId,
      fromUserExternalId: user.externalId,
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage('ice_candidate')
  async handleIceCandidate(
    @MessageBody()
    payload: {
      callId: number;
      targetUserExternalId: string;
      candidate: unknown;
    },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    await this.callsService.assertCanRelaySignal(
      payload.callId,
      user,
      payload.targetUserExternalId,
    );
    this.server.to(`user:${payload.targetUserExternalId}`).emit('ice_candidate', {
      callId: payload.callId,
      fromUserExternalId: user.externalId,
      candidate: payload.candidate,
    });
  }

  private emitCallUpdate(eventName: string, call: CallResponseDto) {
    this.emitCallToParticipants(eventName, call);
  }

  private async resolveSocketUser(socket: Socket) {
    const existingUser = socket.data.user as User | undefined;
    if (existingUser) {
      return existingUser;
    }

    const { user } = await this.authIdentityService.authenticateSocket(socket);
    return user;
  }

  private emitCallToParticipants(eventName: string, call: CallResponseDto) {
    for (const participant of call.participants) {
      this.server.to(`user:${participant.externalId}`).emit(eventName, call);
    }
  }

  private isTerminalCall(call: CallResponseDto) {
    return TERMINAL_CALL_STATUSES.includes(call.status);
  }
}
