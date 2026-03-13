import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { User } from '../entities/user.entity';
import { CallParticipant } from './call-participant.entity';
import { CallsController } from './calls.controller';
import { CallsGateway } from './calls.gateway';
import { CallSession } from './call-session.entity';
import { CallsService } from './calls.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([CallSession, CallParticipant, User]),
  ],
  providers: [CallsService, CallsGateway],
  controllers: [CallsController],
  exports: [CallsService],
})
export class CallsModule {}
