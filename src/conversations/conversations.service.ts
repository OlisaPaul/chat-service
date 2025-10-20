import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { User } from '../entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationsRepository: Repository<Conversation>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private usersService: UsersService,
  ) {}

  private generateParticipantIdsHash(participantIds: number[]): string {
    return participantIds.sort((a, b) => a - b).join(',');
  }

  async createConversation(currentUser: User, otherExternalId: string) {
    // Ensure the other user exists
    let otherUser = await this.usersRepository.findOne({
      where: { externalId: otherExternalId },
    });

    // Create Bob if he doesn't exist yet
    if (!otherUser) {
      otherUser = this.usersRepository.create({
        externalId: otherExternalId,
        name: otherExternalId.split(':').pop() ?? '',
      });
      await this.usersRepository.save(otherUser);
    }

    // Create sorted participant IDs for deterministic hash
    const participantIds = [currentUser.id, otherUser.id].sort((a, b) => a - b);
    const participantIdsHash = this.generateParticipantIdsHash(participantIds);

    // Check if conversation already exists
    let conversation = await this.conversationsRepository.findOne({
      where: { participantIdsHash },
      relations: ['participants'],
    });

    if (!conversation) {
      // Create new conversation
      conversation = this.conversationsRepository.create({
        participantIdsHash,
        participants: [currentUser, otherUser],
      });
      conversation = await this.conversationsRepository.save(conversation);
    }

    return conversation;
  }

  async getUserConversations(user: User) {
    const conversations = await this.conversationsRepository.find({
      where: {
        participants: { id: user.id },
      },
      relations: ['participants'],
      order: { createdAt: 'DESC' },
    });

    // For now, return basic conversation info
    // TODO: Add last message preview when messages are implemented
    return conversations.map(conversation => ({
      id: conversation.id,
      participants: conversation.participants.map(p => ({
        id: p.id,
        externalId: p.externalId,
        name: p.name,
        avatarUrl: p.avatarUrl,
      })),
      createdAt: conversation.createdAt,
      // TODO: Add lastMessage when messages are implemented
    }));
  }
}