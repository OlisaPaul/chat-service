import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { instrument } from '@socket.io/admin-ui';
import { AuthIdentityService } from '../auth/auth-identity.service';
import { PresenceStateService } from './presence-state.service';

@WebSocketGateway({
  cors: {
    origin: ['*', 'https://admin.socket.io'],
    credentials: true,
  },
})
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;

  constructor(
    private readonly authIdentityService: AuthIdentityService,
    private readonly presenceStateService: PresenceStateService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    if (!this.configService.get<boolean>('socketAdmin.enabled')) {
      return;
    }

    instrument(server, {
      auth: this.configService.get<boolean>('socketAdmin.authEnabled')
        ? {
            type: 'basic',
            username:
              this.configService.get<string>('socketAdmin.username') ??
              'admin',
            password:
              this.configService.get<string>('socketAdmin.password') ??
              'admin123',
          }
        : false,
      namespaceName: '/admin',
      mode:
        process.env.NODE_ENV === 'production' ? 'production' : 'development',
      readonly: false,
      serverId: 'chat-service-admin',
    });
  }

  async handleConnection(socket: Socket) {
    try {
      const { user } = await this.authIdentityService.authenticateSocket(socket);

      socket.join(`user:${user.externalId}`);
      this.presenceStateService.markOnline(socket.id, user.externalId, user.name);

      this.server.emit('user_status_changed', {
        userId: user.externalId,
        status: 'online',
      });
    } catch (error) {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = this.presenceStateService.markOffline(socket.id);
    if (!userId) {
      return;
    }

    this.server.emit('user_status_changed', {
      userId,
      status: 'offline',
    });
  }
}
