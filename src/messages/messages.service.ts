import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';
import { Conversation } from '../entities/conversation.entity';
import { User } from '../entities/user.entity';
import { MessageResponseDto } from './dto/message-response.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Conversation) private convoRepo: Repository<Conversation>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async findUserByExternalId(externalId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { externalId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async sendMessage(user: User, conversationId: number, content: string) {
    const convo = await this.convoRepo.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });
    if (!convo) throw new NotFoundException('Conversation not found');

    const isParticipant = convo.participants.some((p) => p.id === user.id);
    if (!isParticipant) throw new NotFoundException('User not part of this conversation');

    const message = this.messageRepo.create({
      conversation: convo,
      sender: user,
      content,
    });
    const saved = await this.messageRepo.save(message);
    return new MessageResponseDto(saved, user);
  }

  async getMessages(conversationId: number, currentUser: User, limit = 20, offset = 0) {
    const messages = await this.messageRepo.find({
      where: { conversation: { id: conversationId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
      skip: offset,
      take: limit,
    });
    return messages.map((m) => new MessageResponseDto(m, currentUser));
  }
}