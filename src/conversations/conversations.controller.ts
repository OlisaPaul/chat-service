import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { User } from '../entities/user.entity';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  async createConversation(
    @Request() req,
    @Body() body: { otherExternalId: string },
  ) {
    const currentUser = req.user as User;
    const conversation = await this.conversationsService.createConversation(
      currentUser,
      body.otherExternalId,
    );

    return {
      id: conversation.id,
      participants: conversation.participants.map(p => ({
        id: p.id,
        externalId: p.externalId,
        name: p.name,
        avatarUrl: p.avatarUrl,
      })),
    };
  }

  @Get()
  async getUserConversations(@Request() req) {
    const currentUser = req.user as User;
    return this.conversationsService.getUserConversations(currentUser);
  }
}