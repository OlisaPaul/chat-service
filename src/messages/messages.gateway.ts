import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway {
  @WebSocketServer() server: Server;

  constructor(
    private messagesService: MessagesService,
    private jwtService: JwtService,
  ) {}

  // ✅ Authenticate and join user to room (conversation)
  handleConnection(socket: Socket) {
    console.log('🔌 New socket connection attempt...');
  
    try {
      const token = socket.handshake.auth?.token;
      console.log('🔑 Token from client:', token);
  
      if (!token) {
        console.log('❌ No token provided, disconnecting...');
        return socket.disconnect();
      }
  
      const payload = this.jwtService.verify(token);
      console.log('✅ JWT verified:', payload);
  
      socket.data.user = payload;
      console.log(`🟢 ${payload.name} connected successfully via WebSocket`);
    } catch (err) {
      console.error('❌ WebSocket auth failed:', err.message);
      socket.disconnect();
    }
  }

  // ✅ Join a conversation room
  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(`conversation:${conversationId}`);
  }

  // ✅ Send a message and broadcast it to the room
  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() data: { conversationId: number; content: string },
    @ConnectedSocket() socket: Socket,
  ) {
    const userPayload = socket.data.user;
    const user = await this.messagesService.findUserByExternalId(
      userPayload.sub,
    );
    const saved = await this.messagesService.sendMessage(
      user,
      data.conversationId,
      data.content,
    );
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('new_message', saved);
    return saved;
  }
}
