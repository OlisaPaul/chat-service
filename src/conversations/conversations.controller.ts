import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
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
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  CreateGroupConversationDto,
  UpdateGroupMembersDto,
} from './dto/create-conversation.dto';

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
    @Param('otherUserId') otherUserId: string,
  ) {
    const currentUser = req.user as User;
    const conversation =
      await this.conversationsService.createPrivateConversation(
        currentUser,
        otherUserId,
      );

    return this.conversationsService.getConversationDetails(
      conversation.id,
      currentUser,
    );
  }

  @Post('group')
  @ApiOperation({ summary: 'Create a group conversation' })
  @ApiResponse({
    status: 201,
    description: 'Group conversation created successfully',
    type: ConversationResponseDto,
  })
  async createGroupConversation(@Request() req, @Body() body: CreateGroupConversationDto) {
    const currentUser = req.user as User;
    const conversation = await this.conversationsService.createGroupConversation(
      currentUser,
      body,
    );
    return this.conversationsService.getConversationDetails(
      conversation.id,
      currentUser,
    );
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get a conversation for the current user' })
  @ApiParam({
    name: 'conversationId',
    description: 'Conversation ID',
    example: 1,
  })
  async getConversation(@Request() req, @Param('conversationId') conversationId: string) {
    const currentUser = req.user as User;
    return this.conversationsService.getConversationDetails(
      Number(conversationId),
      currentUser,
    );
  }

  @Post(':conversationId/members')
  @ApiOperation({ summary: 'Add members to a group conversation' })
  async addGroupMembers(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Body() body: UpdateGroupMembersDto,
  ) {
    const currentUser = req.user as User;
    return this.conversationsService.addGroupMembers(
      Number(conversationId),
      currentUser,
      body.participantIds,
    );
  }

  @Delete(':conversationId/members/:participantExternalId')
  @ApiOperation({ summary: 'Remove a member from a group conversation' })
  async removeGroupMember(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Param('participantExternalId') participantExternalId: string,
  ) {
    const currentUser = req.user as User;
    return this.conversationsService.removeGroupMember(
      Number(conversationId),
      currentUser,
      participantExternalId,
    );
  }

  @Post(':conversationId/leave')
  @ApiOperation({ summary: 'Leave a group conversation' })
  async leaveGroupConversation(
    @Request() req,
    @Param('conversationId') conversationId: string,
  ) {
    const currentUser = req.user as User;
    return this.conversationsService.leaveGroupConversation(
      Number(conversationId),
      currentUser,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of user conversations',
    type: [ConversationResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getUserConversations(
    @Request() req,
    @Query() paginationDto: PaginationDto,
  ) {
    const currentUser = req.user as User;
    return this.conversationsService.getUserConversations(
      currentUser,
      paginationDto,
    );
  }
}
