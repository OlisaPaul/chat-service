import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../entities/user.entity';
import {
  AuthProfileMapper,
  NormalizedAuthProfile,
} from './auth-provider.interfaces';

@Injectable()
export class ClaimBasedProfileMapperService implements AuthProfileMapper {
  constructor(private readonly configService: ConfigService) {}

  normalize(payload: Record<string, unknown>): NormalizedAuthProfile {
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

    const role =
      roleValue && this.isUserRole(roleValue) ? roleValue : undefined;

    return {
      externalId,
      name,
      avatarUrl,
      role,
      rawPayload: payload,
    };
  }

  private isUserRole(value: string): value is UserRole {
    return Object.values(UserRole).includes(value as UserRole);
  }
}
