import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PresenceGateway } from './presence.gateway';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SHARED_SECRET,
    }),
    UsersModule,
    ConfigModule,
  ],
  providers: [PresenceGateway],
  exports: [PresenceGateway],
})
export class PresenceModule {}
