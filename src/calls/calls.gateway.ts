import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { User } from '../entities/user.entity';
import { AuthIdentityService } from '../auth/auth-identity.service';
import { CallsService } from './calls.service';
import { CreateCallDto } from './dto/create-call.dto';
import { CallResponseDto } from './dto/call-response.dto';

@WebSocketGateway({ cors: { origin: '*' } })
export class CallsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly authIdentityService: AuthIdentityService,
    private readonly callsService: CallsService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const { user } = await this.authIdentityService.authenticateSocket(socket);
      socket.join(`user:${user.externalId}`);
    } catch (error) {
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const user = socket.data.user as User | undefined;
    if (!user) {
      return;
    }

    try {
      const updatedCall = await this.callsService.handleDisconnect(user);
      if (updatedCall) {
        this.emitCallUpdate('call_state_changed', updatedCall);
      }
    } catch (error) {
      return;
    }
  }

  @SubscribeMessage('start_call')
  async handleStartCall(
    @MessageBody() payload: CreateCallDto,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = socket.data.user as User;
    const call = await this.callsService.createCall(
      user,
      payload.targetUserId,
      payload.type,
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
    const user = socket.data.user as User;
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
    const user = socket.data.user as User;
    const call = await this.callsService.rejectCall(payload.callId, user);
    this.emitCallUpdate('call_rejected', call);
    return call;
  }

  @SubscribeMessage('cancel_call')
  async handleCancelCall(
    @MessageBody() payload: { callId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = socket.data.user as User;
    const call = await this.callsService.cancelCall(payload.callId, user);
    this.emitCallUpdate('call_cancelled', call);
    return call;
  }

  @SubscribeMessage('end_call')
  async handleEndCall(
    @MessageBody() payload: { callId: number },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = socket.data.user as User;
    const call = await this.callsService.endCall(payload.callId, user);
    this.emitCallUpdate('call_ended', call);
    return call;
  }

  @SubscribeMessage('webrtc_offer')
  async handleOffer(
    @MessageBody()
    payload: { callId: number; targetUserExternalId: string; sdp: unknown },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = socket.data.user as User;
    await this.callsService.assertParticipant(payload.callId, user);
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
    const user = socket.data.user as User;
    await this.callsService.assertParticipant(payload.callId, user);
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
    const user = socket.data.user as User;
    await this.callsService.assertParticipant(payload.callId, user);
    this.server.to(`user:${payload.targetUserExternalId}`).emit('ice_candidate', {
      callId: payload.callId,
      fromUserExternalId: user.externalId,
      candidate: payload.candidate,
    });
  }

  private emitCallUpdate(eventName: string, call: CallResponseDto) {
    this.server.to(`call:${call.id}`).emit(eventName, call);
    this.emitCallToParticipants(eventName, call);
  }

  private emitCallToParticipants(eventName: string, call: CallResponseDto) {
    for (const participant of call.participants) {
      this.server.to(`user:${participant.externalId}`).emit(eventName, call);
    }
  }
}
