import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PresenceGateway } from '../presence/presence.gateway';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SHARED_SECRET,
    }),
  ],
  providers: [UsersService, PresenceGateway],
  controllers: [UsersController],
  exports: [UsersService, PresenceGateway],
})
export class UsersModule {}