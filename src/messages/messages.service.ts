import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus } from './message.entity';
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

  async sendMessage(user: User, conversationId: number, content?: string, mediaUrl?: string, mediaType?: string) {
    // Check if user is part of the conversation using the new participant system
    const participant = await this.convoRepo
      .createQueryBuilder('c')
      .leftJoin('c.participants', 'p')
      .where('c.id = :conversationId', { conversationId })
      .andWhere('p.user.id = :userId', { userId: user.id })
      .getOne();

    if (!participant) throw new NotFoundException('User not part of this conversation');

    const convo = await this.convoRepo.findOne({
      where: { id: conversationId },
    });
    if (!convo) throw new NotFoundException('Conversation not found');

    const message = this.messageRepo.create({
      conversation: convo,
      sender: user,
      content,
      mediaUrl,
      mediaType,
      status: MessageStatus.SENT,
    });
    const saved = await this.messageRepo.save(message);
    return new MessageResponseDto(saved, user);
  }

  async getMessages(conversationId: number, currentUser: User, limit = 20, offset = 0) {
    // First check if user is part of the conversation
    const participant = await this.convoRepo
      .createQueryBuilder('c')
      .leftJoin('c.participants', 'p')
      .where('c.id = :conversationId', { conversationId })
      .andWhere('p.user.id = :userId', { userId: currentUser.id })
      .getOne();

    if (!participant) throw new NotFoundException('User not part of this conversation');

    const messages = await this.messageRepo.find({
      where: { conversation: { id: conversationId } },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });
    return messages.map((m) => new MessageResponseDto(m, currentUser));
  }

  async markMessagesAsRead(conversationId: number, user: User) {
    // Check if user is part of the conversation
    const participant = await this.convoRepo
      .createQueryBuilder('c')
      .leftJoin('c.participants', 'p')
      .where('c.id = :conversationId', { conversationId })
      .andWhere('p.user.id = :userId', { userId: user.id })
      .getOne();

    if (!participant) throw new NotFoundException('User not part of this conversation');

    // Update all unread messages from other users to READ
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.READ })
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('sender.id != :userId', { userId: user.id })
      .andWhere('status != :readStatus', { readStatus: MessageStatus.READ })
      .execute();

    // Return updated messages for broadcasting
    const updatedMessages = await this.messageRepo.find({
      where: {
        conversation: { id: conversationId },
        sender: { id: user.id } // Only return messages from current user that were marked as read
      },
      relations: ['sender'],
    });

    return updatedMessages.map((m) => new MessageResponseDto(m, user));
  }

  async markMessageAsDelivered(messageId: number) {
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ status: MessageStatus.DELIVERED })
      .where('id = :messageId', { messageId })
      .andWhere('status = :sentStatus', { sentStatus: MessageStatus.SENT })
      .execute();
  }
}