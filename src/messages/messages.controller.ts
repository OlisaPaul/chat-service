import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file) {
    if (!file) throw new BadRequestException('No file uploaded');

    // Determine media type based on mimetype
    let mediaType: string;
    if (file.mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    } else {
      mediaType = 'document';
    }

    const fileUrl = `/assets/chat/uploads/${file.filename}`;
    return { url: fileUrl, mediaType };
  }

  @Post(':conversationId')
  async send(
    @Param('conversationId') id: number,
    @Body('content') content: string,
    @Body('imageUrl') imageUrl: string,
    @Request() req,
  ) {
    // Save the message
    const saved = await this.service.sendMessage(
      req.user,
      id,
      content,
      imageUrl,
    );

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
    return this.service.getMessages(
      id,
      req.user,
      Number(limit),
      Number(offset),
    );
  }
}
