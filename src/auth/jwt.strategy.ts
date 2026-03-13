import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthIdentityService } from './auth-identity.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-chat') {
  constructor(
    private readonly authIdentityService: AuthIdentityService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('auth.jwtSecret') ||
        'your_shared_secret_here',
    });
  }

  async validate(payload: any) {
    return this.authIdentityService.resolveUserFromPayload(payload);
  }
}
