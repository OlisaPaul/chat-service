import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PresenceGateway } from '../presence/presence.gateway';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly presenceGateway: PresenceGateway,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getMe(@Request() req) {
    // The user should be attached by the JWT strategy after upsert
    return req.user;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all users except current user' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of users to retrieve',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of users to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of all users except current user',
    type: [UserResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getAllUsers(@Request() req, @Query('limit') limit = 20, @Query('offset') offset = 0) {
    const currentUser = req.user
    return this.usersService.findAllExcept(currentUser.id, Number(limit), Number(offset));
  }

  @Get('online')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get currently online users' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of users to retrieve',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of users to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of currently online users',
    type: [UserResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getOnlineUsers(@Query('limit') limit = 20, @Query('offset') offset = 0) {
    const ids = this.presenceGateway.getOnlineUserIds();
    return this.usersService.findByExternalIds(ids, Number(limit), Number(offset));
  }
}