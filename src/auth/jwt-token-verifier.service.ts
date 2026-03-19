import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthTokenVerifier } from './auth-provider.interfaces';

@Injectable()
export class JwtTokenVerifierService implements AuthTokenVerifier {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  verify(token: string) {
    const secret = this.configService.get<string>('auth.jwtSecret');
    return this.jwtService.verify<Record<string, unknown>>(token, { secret });
  }
}
