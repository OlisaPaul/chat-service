import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PresenceGateway } from './presence.gateway';
import { PresenceController } from './presence.controller';
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
  controllers: [PresenceController],
  exports: [PresenceGateway],
})
export class PresenceModule {}
