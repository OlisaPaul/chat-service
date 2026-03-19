import { UserRole } from '../entities/user.entity';

export interface NormalizedAuthProfile {
  externalId: string;
  name: string;
  avatarUrl?: string;
  role?: UserRole;
  rawPayload: Record<string, unknown>;
}

export interface AuthTokenVerifier {
  verify(token: string): Record<string, unknown>;
}

export interface AuthProfileMapper {
  normalize(payload: Record<string, unknown>): NormalizedAuthProfile;
}
