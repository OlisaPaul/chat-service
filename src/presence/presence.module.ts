import { Module, forwardRef } from '@nestjs/common';
import { PresenceGateway } from './presence.gateway';
import { PresenceController } from './presence.controller';
import { UsersModule } from '../users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { PresenceStateService } from './presence-state.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  providers: [PresenceGateway, PresenceStateService],
  controllers: [PresenceController],
  exports: [PresenceGateway, PresenceStateService],
})
export class PresenceModule {}
