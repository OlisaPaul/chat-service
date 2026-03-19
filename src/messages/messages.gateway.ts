import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { ForbiddenException, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { User } from '../entities/user.entity';
import { AuthIdentityService } from '../auth/auth-identity.service';
import { MessagesService } from './messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { socketGatewayOptions } from '../common/socket-gateway-options';

@WebSocketGateway(socketGatewayOptions)
export class MessagesGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly conversationsService: ConversationsService,
    private readonly authIdentityService: AuthIdentityService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const { user } = await this.authIdentityService.authenticateSocket(socket);
      socket.join(`user:${user.externalId}`);

      const userConversations =
        await this.conversationsService.getUserConversations(user);

      for (const conversation of userConversations) {
        socket.join(`conversation:${conversation.id}`);
      }
    } catch (error) {
      this.logger.warn(`Socket authentication failed for ${socket.id}`);
      socket.disconnect();
    }
  }

  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    const conversation = await this.conversationsService.getConversationById(
      conversationId,
      user,
    );
    if (!conversation) {
      throw new ForbiddenException('User cannot join this conversation room');
    }

    socket.join(`conversation:${conversationId}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody()
    data: {
      conversationId: number;
      content?: string;
      mediaUrl?: string;
      mediaType?: string;
    },
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    const saved = await this.messagesService.sendMessage(
      user,
      data.conversationId,
      data.content,
      data.mediaUrl,
      data.mediaType,
    );

    await this.messagesService.markMessageAsDelivered(saved.id);
    const updatedMessage = { ...saved, status: 'delivered' };

    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('new_message', updatedMessage);
    socket.emit('new_message', updatedMessage);

    return updatedMessage;
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: user.externalId,
      userName: user.name,
      isTyping: true,
      conversationId,
    });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    socket.to(`conversation:${conversationId}`).emit('user_typing', {
      userId: user.externalId,
      userName: user.name,
      isTyping: false,
      conversationId,
    });
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    const user = await this.resolveSocketUser(socket);
    const updatedMessages = await this.messagesService.markMessagesAsRead(
      conversationId,
      user,
    );

    this.server.to(`conversation:${conversationId}`).emit('messages_read', {
      conversationId,
      userId: user.externalId,
      updatedMessages,
    });

    socket.emit('messages_read', {
      conversationId,
      userId: user.externalId,
      updatedMessages,
    });
  }

  private async resolveSocketUser(socket: Socket) {
    const existingUser = socket.data.user as User | undefined;
    if (existingUser) {
      return existingUser;
    }

    const { user } = await this.authIdentityService.authenticateSocket(socket);
    return user;
  }
}
