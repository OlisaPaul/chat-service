import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConversationsService } from './conversations.service';
import { Conversation } from '../entities/conversation.entity';
import { ConversationParticipant } from '../entities/conversation-participant.entity';
import { User } from '../entities/user.entity';
import { UsersService } from '../users/users.service';
import { RoleAuthorizationService } from '../auth/role-authorization.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let conversationsRepository: jest.Mocked<Repository<Conversation>>;
  let participantsRepository: jest.Mocked<Repository<ConversationParticipant>>;
  let usersRepository: jest.Mocked<Repository<User>>;
  let usersService: jest.Mocked<UsersService>;
  let roleAuthorizationService: jest.Mocked<RoleAuthorizationService>;

  const alice = {
    id: 1,
    externalId: 'appA:alice',
    name: 'Alice',
    role: 'billable',
  } as unknown as User;

  const bob = {
    id: 2,
    externalId: 'appA:bob',
    name: 'Bob',
    role: 'billable',
  } as unknown as User;

  const charlie = {
    id: 3,
    externalId: 'appA:charlie',
    name: 'Charlie',
    role: 'billable',
  } as unknown as User;

  beforeEach(() => {
    conversationsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Conversation>>;

    participantsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<ConversationParticipant>>;

    usersRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    usersService = {} as jest.Mocked<UsersService>;
    roleAuthorizationService = {
      canInitiateConversation: jest.fn().mockReturnValue(true),
      getForbiddenMessage: jest.fn().mockReturnValue('forbidden'),
    } as unknown as jest.Mocked<RoleAuthorizationService>;

    service = new ConversationsService(
      conversationsRepository,
      participantsRepository,
      usersRepository,
      usersService,
      roleAuthorizationService,
    );
  });

  it('creates a named group with creator as admin', async () => {
    usersRepository.find.mockResolvedValue([bob, charlie]);
    conversationsRepository.create.mockReturnValue({
      type: 'group',
      name: 'Project Team',
      participantIdsHash: null,
    } as Conversation);
    conversationsRepository.save.mockResolvedValue({
      id: 20,
      type: 'group',
      name: 'Project Team',
    } as Conversation);
    participantsRepository.create.mockImplementation((value) => value as any);
    participantsRepository.save.mockResolvedValue([] as any);
    conversationsRepository.findOne.mockResolvedValue({
      id: 20,
      type: 'group',
      name: 'Project Team',
      participants: [
        { user: alice, role: 'admin' },
        { user: bob, role: 'member' },
        { user: charlie, role: 'member' },
      ],
    } as any);

    const result = await service.createGroupConversation(alice, {
      name: 'Project Team',
      participantIds: ['appA:bob', 'appA:charlie'],
    });

    expect(conversationsRepository.create).toHaveBeenCalledWith({
      type: 'group',
      name: 'Project Team',
      participantIdsHash: null,
    });
    expect(participantsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: alice, role: 'admin' }),
    );
    expect(participantsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: bob, role: 'member' }),
    );
    expect(result.name).toBe('Project Team');
  });

  it('allows group admins to add new members', async () => {
    jest.spyOn(service, 'getConversationById').mockResolvedValue({
      id: 30,
      type: 'group',
      participants: [
        { id: 1, user: alice, role: 'admin' },
        { id: 2, user: bob, role: 'member' },
      ],
    } as any);
    usersRepository.find.mockResolvedValue([charlie]);
    participantsRepository.create.mockImplementation((value) => value as any);
    participantsRepository.save.mockResolvedValue([] as any);
    jest.spyOn(service, 'getConversationDetails').mockResolvedValue({
      id: 30,
      type: 'group',
      name: 'Project Team',
      participants: [],
    } as any);

    await service.addGroupMembers(30, alice, ['appA:charlie']);

    expect(participantsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: charlie, role: 'member' }),
    );
  });

  it('prevents non-admin users from adding group members', async () => {
    jest.spyOn(service, 'getConversationById').mockResolvedValue({
      id: 30,
      type: 'group',
      participants: [
        { id: 1, user: alice, role: 'member' },
        { id: 2, user: bob, role: 'member' },
      ],
    } as any);

    await expect(
      service.addGroupMembers(30, alice, ['appA:charlie']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents admins from removing other admins in this phase', async () => {
    jest.spyOn(service, 'getConversationById').mockResolvedValue({
      id: 30,
      type: 'group',
      participants: [
        { id: 1, user: alice, role: 'admin' },
        { id: 2, user: bob, role: 'admin' },
      ],
    } as any);

    await expect(
      service.removeGroupMember(30, alice, 'appA:bob'),
    ).rejects.toThrow('Admin participants cannot be removed in this phase');
  });

  it('returns not found when requested group members do not exist', async () => {
    usersRepository.find.mockResolvedValue([bob]);

    await expect(
      service.createGroupConversation(alice, {
        name: 'Project Team',
        participantIds: ['appA:bob', 'appA:charlie'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
