import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { User } from '../entities/user.entity';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('private/:otherUserId')
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
      type: conversation.type,
      participants: conversation.participants?.map(p => ({
        id: p.user?.id,
        externalId: p.user?.externalId,
        name: p.user?.name,
        avatarUrl: p.user?.avatarUrl,
        role: p.role,
      })) || [],
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  @Get()
  async getUserConversations(@Request() req) {
    const currentUser = req.user as User;
    return this.conversationsService.getUserConversations(currentUser);
  }
}