import {config} from 'dotenv'
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { Message } from './message.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationParticipant } from '../entities/conversation-participant.entity';
import { User } from '../entities/user.entity';
import { ConversationsModule } from '../conversations/conversations.module';

config()

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Conversation, ConversationParticipant, User]),
    JwtModule.register({
      secret: process.env.JWT_SHARED_SECRET,
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = '/home/assets/chat/uploads';
          if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // limit: 5MB
    }),
    ConversationsModule,
  ],
  providers: [MessagesService, MessagesGateway],
  controllers: [MessagesController],
})
export class MessagesModule {}
