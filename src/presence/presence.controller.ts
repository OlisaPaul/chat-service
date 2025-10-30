import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { PresenceGateway } from './presence.gateway';

@ApiTags('Presence')
@Controller('presence')
export class PresenceController {
  constructor(private readonly presenceGateway: PresenceGateway) {}

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
  getOnlineUsers() {
    const users = this.presenceGateway.getOnlineUsersDetails();
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
  getStats() {
    return {
      onlineUsersCount: this.presenceGateway.getOnlineUsersCount(),
      totalSockets: this.presenceGateway.getOnlineUsersDetails().length,
      recentEventsCount: this.presenceGateway.getRecentEvents().length,
    };
  }
}