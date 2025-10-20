import { Message } from '../message.entity';
import { User } from '../../entities/user.entity';

export class MessageResponseDto {
  id: number;
  content: string;
  senderName: string;
  sentByMe: boolean;
  createdAt: Date;

  constructor(message: Message, currentUser: User) {
    this.id = message.id;
    this.content = message.content;
    this.senderName = message.sender?.name ?? 'Unknown';
    this.sentByMe = message.sender?.id === currentUser.id;
    this.createdAt = message.createdAt;
  }
}