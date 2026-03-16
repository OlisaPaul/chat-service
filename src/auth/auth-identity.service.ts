import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';
import { User, UserRole } from '../entities/user.entity';
import { UsersService } from '../users/users.service';

export interface NormalizedAuthProfile {
  externalId: string;
  name: string;
  avatarUrl?: string;
  role?: UserRole;
  rawPayload: Record<string, unknown>;
}

@Injectable()
export class AuthIdentityService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  verifyToken(token: string) {
    const secret = this.configService.get<string>('auth.jwtSecret');
    return this.jwtService.verify<Record<string, unknown>>(token, { secret });
  }

  normalizePayload(payload: Record<string, unknown>): NormalizedAuthProfile {
    const subjectClaim =
      this.configService.get<string>('auth.claims.subject') ?? 'sub';
    const nameClaim =
      this.configService.get<string>('auth.claims.name') ?? 'name';
    const avatarClaim =
      this.configService.get<string>('auth.claims.avatarUrl') ?? 'avatarUrl';
    const roleClaim =
      this.configService.get<string>('auth.claims.role') ?? 'role';

    const externalId = payload[subjectClaim];
    const name = payload[nameClaim];

    if (typeof externalId !== 'string' || !externalId.trim()) {
      throw new UnauthorizedException(
        `Missing or invalid auth subject claim: ${subjectClaim}`,
      );
    }

    if (typeof name !== 'string' || !name.trim()) {
      throw new UnauthorizedException(
        `Missing or invalid auth name claim: ${nameClaim}`,
      );
    }

    const avatarUrl =
      typeof payload[avatarClaim] === 'string'
        ? (payload[avatarClaim] as string)
        : undefined;

    const roleValue =
      typeof payload[roleClaim] === 'string'
        ? (payload[roleClaim] as string)
        : undefined;

    const role = roleValue && this.isUserRole(roleValue)
      ? roleValue
      : undefined;

    return {
      externalId,
      name,
      avatarUrl,
      role,
      rawPayload: payload,
    };
  }

  async resolveUserFromPayload(payload: Record<string, unknown>): Promise<User> {
    const profile = this.normalizePayload(payload);
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

  private isUserRole(value: string): value is UserRole {
    return Object.values(UserRole).includes(value as UserRole);
  }
}
