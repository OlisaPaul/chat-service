import { Message, MessageStatus } from '../message.entity';
import { User } from '../../entities/user.entity';

export class MessageResponseDto {
  id: number;
  content?: string;
  imageUrl?: string;
  senderName: string;
  sentByMe: boolean;
  status: MessageStatus;
  createdAt: Date;
  conversationId: number;

  constructor(message: Message, currentUser: User) {
    this.id = message.id;
    this.content = message.content;
    this.imageUrl = message.imageUrl;
    this.senderName = message.sender?.name ?? 'Unknown';
    this.sentByMe = message.sender?.id === currentUser.id;
    this.status = message.status;
    this.createdAt = message.createdAt;
    this.conversationId = message.conversation?.id
  }
}