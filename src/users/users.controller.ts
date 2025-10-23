import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PresenceGateway } from '../presence/presence.gateway';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly presenceGateway: PresenceGateway,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Request() req) {
    // The user should be attached by the JWT strategy after upsert
    return req.user;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@Request() req) {
    const currentUser = req.user;
    return this.usersService.findAllExcept(currentUser.id);
  }

  @Get('online')
  @UseGuards(JwtAuthGuard)
  async getOnlineUsers() {
    const ids = this.presenceGateway.getOnlineUserIds();
    return this.usersService.findByExternalIds(ids);
  }
}