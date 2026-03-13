import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Conversation,
  ConversationType,
} from '../entities/conversation.entity';
import {
  ConversationParticipant,
  ParticipantRole,
} from '../entities/conversation-participant.entity';
import { User } from '../entities/user.entity';
import { UsersService } from '../users/users.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  getPaginatedData,
  getPaginationResponse,
} from '../common/helper-functions/get-pagination-meta';
import { RoleAuthorizationService } from '../auth/role-authorization.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationsRepository: Repository<Conversation>,
    @InjectRepository(ConversationParticipant)
    private participantsRepository: Repository<ConversationParticipant>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private usersService: UsersService,
    private roleAuthorizationService: RoleAuthorizationService,
  ) {}

  private generateParticipantIdsHash(participantIds: number[]): string {
    return participantIds.sort((a, b) => a - b).join(',');
  }

  async createPrivateConversation(
    currentUser: User,
    otherUserIdentifier: string,
  ): Promise<Conversation> {
    // Ensure the other user exists
    const parsedId = Number(otherUserIdentifier);
    const isNumericIdentifier =
      Number.isInteger(parsedId) && String(parsedId) === otherUserIdentifier;

    let otherUser = await this.usersRepository.findOne({
      where: isNumericIdentifier
        ? { id: parsedId }
        : { externalId: otherUserIdentifier },
    });

    // Create user if they don't exist yet
    if (!otherUser) {
      otherUser = this.usersRepository.create({
        externalId: otherUserIdentifier.toString(),
        name: otherUserIdentifier.toString().split(':').pop() ?? '',
      });
      await this.usersRepository.save(otherUser);
    }

    // Check if a private conversation already exists between these two users
    // Use a query that joins participants to find existing conversations
    const existingConversation = await this.conversationsRepository
      .createQueryBuilder('c')
      .leftJoin('c.participants', 'p1')
      .leftJoin('c.participants', 'p2')
      .where('c.type = :type', { type: 'private' })
      .andWhere('p1.user.id = :user1Id', { user1Id: currentUser.id })
      .andWhere('p2.user.id = :user2Id', { user2Id: otherUser.id })
      .andWhere('p1.conversation.id = p2.conversation.id')
      .getOne();

    if (existingConversation) {
      console.log('Found existing conversation:', existingConversation.id);
      // Reload with full relations
      return (await this.conversationsRepository.findOne({
        where: { id: existingConversation.id },
        relations: ['participants', 'participants.user'],
      })) as Conversation;
    }

    // Create new private conversation
    console.log(
      'Creating new conversation between users:',
      currentUser.id,
      otherUser.id,
    );

    // Validate role-based authorization for conversation initiation
    const canInitiate = this.roleAuthorizationService.canInitiateConversation(
      currentUser.role,
      otherUser.role,
    );

    if (!canInitiate) {
      const errorMessage = this.roleAuthorizationService.getForbiddenMessage(
        currentUser.role,
        otherUser.role,
      );
      throw new ForbiddenException(errorMessage);
    }

    // Create sorted participant IDs for deterministic hash
    const participantIds = [currentUser.id, otherUser.id].sort((a, b) => a - b);
    const participantIdsHash = this.generateParticipantIdsHash(participantIds);

    const conversation = this.conversationsRepository.create({
      type: 'private' as ConversationType,
      participantIdsHash,
    });
    const savedConversation =
      await this.conversationsRepository.save(conversation);

    // Create participant records
    const participants = [
      this.participantsRepository.create({
        conversation: savedConversation,
        user: currentUser,
        role: 'member' as ParticipantRole,
      }),
      this.participantsRepository.create({
        conversation: savedConversation,
        user: otherUser,
        role: 'member' as ParticipantRole,
      }),
    ];
    await this.participantsRepository.save(participants);

    // Return conversation with participants
    return (await this.conversationsRepository.findOne({
      where: { id: savedConversation.id },
      relations: ['participants', 'participants.user'],
    })) as Conversation;
  }

  async getUserConversations(user: User, paginationDto?: PaginationDto) {
    let data: any;
    let total: number;
    const qb = this.participantsRepository
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.conversation', 'conversation')
      .leftJoinAndSelect(
        'conversation.participants',
        'conversationParticipants',
      )
      .leftJoinAndSelect(
        'conversationParticipants.user',
        'conversationParticipantsUser',
      )
      .where('participant.user = :userId', { userId: user.id })
      .orderBy('conversation.updatedAt', 'DESC');
    if (paginationDto) {
      const paginatedData = await getPaginatedData(paginationDto, qb);
      data = paginatedData.data;
      total = paginatedData.total;
    } else {
      data = qb.getMany();
      return data;
    }
    const mappedData = data.map((participant) => {
      const conversation = participant.conversation;
      return {
        id: conversation.id,
        type: conversation.type,
        participants: conversation.participants.map((p) => ({
          id: p.user.id,
          externalId: p.user.externalId,
          name: p.user.name,
          avatarUrl: p.user.avatarUrl,
          role: p.role,
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        // TODO: Add lastMessage when messages are implemented
      };
    });
    if (!paginationDto) {
      return mappedData;
    } else {
      return await getPaginationResponse(paginationDto, qb, mappedData, total);
    }
  }

  async getConversationById(
    id: number,
    user: User,
  ): Promise<Conversation | null> {
    const participant = await this.participantsRepository.findOne({
      where: { conversation: { id }, user: { id: user.id } },
      relations: [
        'conversation',
        'conversation.participants',
        'conversation.participants.user',
      ],
    });

    return participant?.conversation || null;
  }
}
