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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { MessagesGateway } from './messages.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@ApiTags('Messages')
@ApiBearerAuth('JWT-auth')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly service: MessagesService,
    private readonly gateway: MessagesGateway,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file (image, video, or document)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (image, video, or document)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: '/assets/chat/uploads/file-123.mp4' },
        mediaType: { type: 'string', enum: ['image', 'video', 'document'], example: 'video' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'No file uploaded or invalid file type' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({
    name: 'conversationId',
    description: 'ID of the conversation',
    example: 1,
  })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid conversation or message data' })
  async send(
    @Param('conversationId') id: number,
    @Body() body: SendMessageDto,
    @Request() req,
  ) {
    // Save the message
    const saved = await this.service.sendMessage(
      req.user,
      id,
      body.content,
      body.mediaUrl,
      body.mediaType,
    );

    // Broadcast message to all clients in that room
    this.gateway.server.to(`conversation:${id}`).emit('new_message', saved);

    return saved;
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get messages from a conversation' })
  @ApiParam({
    name: 'conversationId',
    description: 'ID of the conversation',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of messages to retrieve',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of messages to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'List of messages',
    type: [MessageResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
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
