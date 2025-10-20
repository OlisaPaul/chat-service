import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt-chat') {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SHARED_SECRET || 'your_shared_secret_here',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.upsertExternalUser(
      payload.sub,
      payload.name,
      payload.avatarUrl
    );
    return user;
  }
}