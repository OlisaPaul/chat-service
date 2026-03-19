import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { User } from '../entities/user.entity';
import { UsersService } from '../users/users.service';
import { AUTH_PROFILE_MAPPER, AUTH_TOKEN_VERIFIER } from './auth.constants';
import type {
  AuthProfileMapper,
  AuthTokenVerifier,
  NormalizedAuthProfile,
} from './auth-provider.interfaces';

@Injectable()
export class AuthIdentityService {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject(AUTH_TOKEN_VERIFIER)
    private readonly authTokenVerifier: AuthTokenVerifier,
    @Inject(AUTH_PROFILE_MAPPER)
    private readonly authProfileMapper: AuthProfileMapper,
  ) {}

  verifyToken(token: string) {
    return this.authTokenVerifier.verify(token);
  }

  normalizePayload(payload: Record<string, unknown>): NormalizedAuthProfile {
    return this.authProfileMapper.normalize(payload);
  }

  async resolveUserFromPayload(payload: Record<string, unknown>): Promise<User> {
    const profile = this.normalizePayload(payload);
    const autoProvisionUsers =
      this.configService.get<boolean>('auth.autoProvisionUsers') ?? true;

    if (!autoProvisionUsers) {
      const existingUser = await this.usersService.findByExternalId(
        profile.externalId,
      );

      if (!existingUser) {
        throw new UnauthorizedException(
          `User ${profile.externalId} is not provisioned in this deployment`,
        );
      }

      return existingUser;
    }

    return this.usersService.upsertExternalUser(
      profile.externalId,
      profile.name,
      profile.avatarUrl,
      profile.role,
    );
  }

  async authenticateSocket(socket: Socket): Promise<{
    payload: Record<string, unknown>;
    user: User;
  }> {
    const token = this.extractSocketToken(socket);
    const payload = this.verifyToken(token);
    const user = await this.resolveUserFromPayload(payload);

    socket.data.auth = payload;
    socket.data.user = user;

    return { payload, user };
  }

  private extractSocketToken(socket: Socket): string {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken;
    }

    const headerValue = socket.handshake.headers?.authorization;
    if (typeof headerValue === 'string' && headerValue.startsWith('Bearer ')) {
      return headerValue.replace('Bearer ', '').trim();
    }

    throw new UnauthorizedException('Missing socket auth token');
  }
}
