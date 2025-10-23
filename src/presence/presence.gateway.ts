import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private onlineUsers = new Map<string, string>(); // socket.id -> externalId

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing token');

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findByExternalId(payload.sub);

      if (!user) throw new Error('User not found');

      this.onlineUsers.set(socket.id, user.externalId);
      this.server.emit('user_status_changed', { userId: user.externalId, status: 'online' });

      console.log(`✅ ${user.name} is now online`);
    } catch (err) {
      console.log('❌ Presence connection failed:', err.message);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = this.onlineUsers.get(socket.id);
    if (userId) {
      this.onlineUsers.delete(socket.id);
      this.server.emit('user_status_changed', { userId, status: 'offline' });
      console.log(`⚠️ User ${userId} went offline`);
    }
  }

  getOnlineUserIds(): string[] {
    return Array.from(new Set(this.onlineUsers.values()));
  }
}