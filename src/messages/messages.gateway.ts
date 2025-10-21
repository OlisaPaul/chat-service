import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  constructor(
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
    private jwtService: JwtService,
  ) {}

  // ✅ Authenticate and auto-join user to their conversation rooms
  async handleConnection(socket: Socket) {
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

      // Auto-join all user's conversation rooms
      const user = await this.messagesService.findUserByExternalId(payload.sub);
      const userConversations = await this.conversationsService.getUserConversations(user);

      for (const conversation of userConversations) {
        socket.join(`conversation:${conversation.id}`);
        console.log(`📍 ${payload.name} joined conversation room: ${conversation.id}`);
      }

      console.log(`🟢 ${payload.name} connected successfully via WebSocket`);
    } catch (err) {
      console.error('❌ WebSocket auth failed:', err.message);
      socket.disconnect();
    }
  }

  // ✅ Join a conversation room (additional manual join)
  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(`conversation:${conversationId}`);
    console.log(`📍 User joined conversation room: ${conversationId}`);
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

    // Mark message as delivered since recipient is connected
    await this.messagesService.markMessageAsDelivered(saved.id);

    // Get updated message with DELIVERED status
    const updatedMessage = { ...saved, status: 'delivered' };

    // Broadcast to all clients in the conversation room (including sender)
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('new_message', updatedMessage);
    return updatedMessage;
  }

  // ✅ Optional: Typing indicators
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const userPayload = socket.data.user;
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: userPayload.sub,
      userName: userPayload.name,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const userPayload = socket.data.user;
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: userPayload.sub,
      userName: userPayload.name,
      isTyping: false,
    });
  }

  // ✅ Mark messages as read when user opens chat
  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const userPayload = socket.data.user;
    const user = await this.messagesService.findUserByExternalId(userPayload.sub);

    const updatedMessages = await this.messagesService.markMessagesAsRead(conversationId, user);

    // Broadcast status updates to the conversation room
    this.server
      .to(`conversation:${conversationId}`)
      .emit('messages_read', {
        conversationId,
        userId: userPayload.sub,
        updatedMessages,
      });
  }
}
