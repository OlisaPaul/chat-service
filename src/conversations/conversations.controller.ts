import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { User } from '../entities/user.entity';
import { ConversationResponseDto } from './dto/conversation-response.dto';

@ApiTags('Conversations')
@ApiBearerAuth('JWT-auth')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('private/:otherUserId')
  @ApiOperation({ summary: 'Create a private conversation with another user' })
  @ApiParam({
    name: 'otherUserId',
    description: 'ID of the partner user',
    example: '1',
  })
  @ApiResponse({
    status: 201,
    description: 'Private conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async createPrivateConversation(
    @Request() req,
    @Param('otherUserId') otherUserId: number,
  ) {
    const currentUser = req.user as User;
    const conversation = await this.conversationsService.createPrivateConversation(
      currentUser,
      otherUserId,
    );

    return {
      id: conversation.id,
      participants: conversation.participants?.map(p => ({
        id: p.user?.id,
        externalId: p.user?.externalId,
        name: p.user?.name,
        avatarUrl: p.user?.avatarUrl,
      })) || [],
      createdAt: conversation.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user conversations',
    type: [ConversationResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getUserConversations(@Request() req) {
    const currentUser = req.user as User;
    return this.conversationsService.getUserConversations(currentUser);
  }
}