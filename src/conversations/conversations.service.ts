import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
import { CreateGroupConversationDto } from './dto/create-conversation.dto';

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

  private mapConversationResponse(conversation: Conversation) {
    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name ?? undefined,
      participants: conversation.participants.map((p) => ({
        id: p.user.id,
        externalId: p.user.externalId,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        role: p.role,
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  private async resolveUsersByExternalIds(externalIds: string[]) {
    const normalizedExternalIds = Array.from(
      new Set(
        externalIds
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    if (!normalizedExternalIds.length) {
      throw new BadRequestException('At least one participant is required');
    }

    const users = await this.usersRepository.find({
      where: normalizedExternalIds.map((externalId) => ({ externalId })),
    });

    const foundExternalIds = new Set(users.map((user) => user.externalId));
    const missingExternalIds = normalizedExternalIds.filter(
      (externalId) => !foundExternalIds.has(externalId),
    );

    if (missingExternalIds.length) {
      throw new NotFoundException(
        `Users not found: ${missingExternalIds.join(', ')}`,
      );
    }

    return users;
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
      name: null,
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

  async createGroupConversation(
    currentUser: User,
    body: CreateGroupConversationDto,
  ): Promise<Conversation> {
    const invitedUsers = await this.resolveUsersByExternalIds(body.participantIds);
    const usersById = new Map<number, User>();
    usersById.set(currentUser.id, currentUser);
    invitedUsers.forEach((user) => usersById.set(user.id, user));

    const participants = Array.from(usersById.values());
    if (participants.length < 2) {
      throw new BadRequestException(
        'A group conversation requires at least two participants including the creator',
      );
    }

    const conversation = this.conversationsRepository.create({
      type: 'group' as ConversationType,
      name: body.name.trim(),
      participantIdsHash: null,
    });
    const savedConversation =
      await this.conversationsRepository.save(conversation);

    const conversationParticipants = participants.map((user) =>
      this.participantsRepository.create({
        conversation: savedConversation,
        user,
        role:
          user.id === currentUser.id
            ? ('admin' as ParticipantRole)
            : ('member' as ParticipantRole),
      }),
    );
    await this.participantsRepository.save(conversationParticipants);

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
    const mappedData = data.map((participant) =>
      this.mapConversationResponse(participant.conversation),
    );
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

  async getConversationDetails(id: number, user: User) {
    const conversation = await this.getConversationById(id, user);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.mapConversationResponse(conversation);
  }

  async addGroupMembers(
    conversationId: number,
    currentUser: User,
    participantExternalIds: string[],
  ) {
    const conversation = await this.getConversationById(conversationId, currentUser);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.type !== 'group') {
      throw new BadRequestException('Only group conversations support membership updates');
    }

    const currentParticipant = conversation.participants.find(
      (participant) => participant.user.id === currentUser.id,
    );
    if (!currentParticipant || currentParticipant.role !== 'admin') {
      throw new ForbiddenException('Only group admins can add members');
    }

    const usersToAdd = await this.resolveUsersByExternalIds(participantExternalIds);
    const existingUserIds = new Set(
      conversation.participants.map((participant) => participant.user.id),
    );

    const newParticipants = usersToAdd
      .filter((user) => !existingUserIds.has(user.id))
      .map((user) =>
        this.participantsRepository.create({
          conversation,
          user,
          role: 'member' as ParticipantRole,
        }),
      );

    if (newParticipants.length) {
      await this.participantsRepository.save(newParticipants);
    }

    return this.getConversationDetails(conversationId, currentUser);
  }

  async removeGroupMember(
    conversationId: number,
    currentUser: User,
    participantExternalId: string,
  ) {
    const conversation = await this.getConversationById(conversationId, currentUser);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.type !== 'group') {
      throw new BadRequestException('Only group conversations support membership updates');
    }

    const currentParticipant = conversation.participants.find(
      (participant) => participant.user.id === currentUser.id,
    );
    if (!currentParticipant || currentParticipant.role !== 'admin') {
      throw new ForbiddenException('Only group admins can remove members');
    }

    const participantToRemove = conversation.participants.find(
      (participant) => participant.user.externalId === participantExternalId,
    );
    if (!participantToRemove) {
      throw new NotFoundException('Participant not found in this group');
    }
    if (participantToRemove.role === 'admin') {
      throw new BadRequestException('Admin participants cannot be removed in this phase');
    }

    await this.participantsRepository.delete(participantToRemove.id);
    return this.getConversationDetails(conversationId, currentUser);
  }

  async leaveGroupConversation(conversationId: number, currentUser: User) {
    const conversation = await this.getConversationById(conversationId, currentUser);
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.type !== 'group') {
      throw new BadRequestException('Only group conversations can be left');
    }

    const currentParticipant = conversation.participants.find(
      (participant) => participant.user.id === currentUser.id,
    );
    if (!currentParticipant) {
      throw new NotFoundException('Participant not found in this group');
    }
    if (currentParticipant.role === 'admin') {
      throw new BadRequestException('Group admins cannot leave until admin transfer is supported');
    }

    await this.participantsRepository.delete(currentParticipant.id);
    return { left: true, conversationId };
  }
}
