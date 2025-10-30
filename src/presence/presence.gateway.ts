import { config } from 'dotenv';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { instrument } from '@socket.io/admin-ui';

config();

@WebSocketGateway({
  cors: {
    origin: ['*', 'https://admin.socket.io'], // allow admin UI
    credentials: true,
  },
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;
  private onlineUsers = new Map<string, string>(); // socket.id -> externalId
  private eventLog: any[] = []; // Store recent events for monitoring

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    // Configure Socket.IO Admin UI
    instrument(server, {
      auth: false, // Disable auth for easier access during development
      namespaceName: '/admin',
      mode:
        process.env.NODE_ENV === 'production' ? 'production' : 'development',
      readonly: false,
      serverId: 'chat-service-admin',
    });

    console.log('🔧 Socket.IO Admin UI configured at /admin');
    console.log('🌐 Access at: http://localhost:3001/admin');
    console.log('⚠️  Auth disabled for development - enable in production');
  }

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing token');

      const payload = this.jwtService.verify(token);
      console.log({ payload });
      const user = await this.usersService.findByExternalId(payload.sub);

      if (!user) throw new Error('User not found');

      this.onlineUsers.set(socket.id, user.externalId);

      // Log event
      this.logEvent('user_online', {
        userId: user.externalId,
        userName: user.name,
      });

      this.server.emit('user_status_changed', {
        userId: user.externalId,
        status: 'online',
      });

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

      // Log event
      this.logEvent('user_offline', { userId });

      this.server.emit('user_status_changed', { userId, status: 'offline' });
      console.log(`⚠️ User ${userId} went offline`);
    }
  }

  getOnlineUserIds(): string[] {
    return Array.from(new Set(this.onlineUsers.values()));
  }

  getOnlineUsersCount(): number {
    return this.getOnlineUserIds().length;
  }

  getOnlineUsersDetails(): Array<{ socketId: string; userId: string }> {
    return Array.from(this.onlineUsers.entries()).map(([socketId, userId]) => ({
      socketId,
      userId,
    }));
  }

  getRecentEvents(limit: number = 50): any[] {
    return this.eventLog.slice(-limit);
  }

  private logEvent(eventType: string, data: any) {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      data,
    };
    this.eventLog.push(event);

    // Keep only last 100 events
    if (this.eventLog.length > 100) {
      this.eventLog.shift();
    }
  }
}
