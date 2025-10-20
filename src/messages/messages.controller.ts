import { Controller, Post, Get, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MessagesGateway } from './messages.gateway'; // ✅ import gateway

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly service: MessagesService,
    private readonly gateway: MessagesGateway, // ✅ inject gateway
  ) {}

  @Post(':conversationId')
  async send(
    @Param('conversationId') id: number,
    @Body('content') content: string,
    @Request() req,
  ) {
    // Save the message
    const saved = await this.service.sendMessage(req.user, id, content);

    // ✅ Broadcast message to all clients in that room
    this.gateway.server.to(`conversation:${id}`).emit('new_message', saved);

    return saved;
  }

  @Get(':conversationId')
  async list(
    @Param('conversationId') id: number,
    @Request() req,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    return this.service.getMessages(id, req.user, Number(limit), Number(offset));
  }
}
