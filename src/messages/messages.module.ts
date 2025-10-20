import {config} from 'dotenv'
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
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
    ConversationsModule,
  ],
  providers: [MessagesService, MessagesGateway],
  controllers: [MessagesController],
})
export class MessagesModule {}
