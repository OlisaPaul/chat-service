import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PresenceStateService } from './presence-state.service';

@ApiTags('Presence')
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceStateService: PresenceStateService) {}

  @Get('online-users')
  @ApiOperation({ summary: 'Get list of currently online users' })
  @ApiResponse({
    status: 200,
    description: 'List of online users with their details',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 3 },
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              socketId: { type: 'string', example: 'abc123' },
              userId: { type: 'string', example: 'appA:user123' },
            },
          },
        },
      },
    },
  })
  async getOnlineUsers() {
    const users = await this.presenceStateService.getOnlineUsersDetails();
    return {
      count: users.length,
      users,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get presence statistics' })
  @ApiResponse({
    status: 200,
    description: 'Presence statistics',
    schema: {
      type: 'object',
      properties: {
        onlineUsersCount: { type: 'number', example: 5 },
        totalSockets: { type: 'number', example: 7 },
        recentEventsCount: { type: 'number', example: 23 },
      },
    },
  })
  async getStats() {
    const [onlineUsersCount, users, recentEvents] = await Promise.all([
      this.presenceStateService.getOnlineUsersCount(),
      this.presenceStateService.getOnlineUsersDetails(),
      this.presenceStateService.getRecentEvents(),
    ]);

    return {
      onlineUsersCount,
      totalSockets: users.length,
      recentEventsCount: recentEvents.length,
    };
  }
}
