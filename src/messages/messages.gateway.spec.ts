import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { AuthIdentityService } from '../auth/auth-identity.service';

describe('MessagesGateway', () => {
  let gateway: MessagesGateway;
  let messagesService: jest.Mocked<MessagesService>;
  let conversationsService: jest.Mocked<ConversationsService>;
  let authIdentityService: jest.Mocked<AuthIdentityService>;
  let socket: any;
  let server: any;

  const user = {
    id: 1,
    externalId: 'appA:alice',
    name: 'Alice',
  } as any;

  beforeEach(() => {
    messagesService = {
      sendMessage: jest.fn(),
      markMessageAsDelivered: jest.fn(),
    } as unknown as jest.Mocked<MessagesService>;
    conversationsService = {
      getUserConversations: jest.fn(),
    } as unknown as jest.Mocked<ConversationsService>;
    authIdentityService = {
      authenticateSocket: jest.fn(),
    } as unknown as jest.Mocked<AuthIdentityService>;

    gateway = new MessagesGateway(
      messagesService,
      conversationsService,
      authIdentityService,
    );
    server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    gateway.server = server;
    socket = {
      data: { user },
      emit: jest.fn(),
      join: jest.fn(),
      disconnect: jest.fn(),
    };
  });

  it('still emits delivered chat messages after the calls feature was added', async () => {
    messagesService.sendMessage.mockResolvedValue({
      id: 10,
      content: 'hello',
      status: 'sent',
    } as any);
    messagesService.markMessageAsDelivered.mockResolvedValue(undefined);

    const result = await gateway.handleMessage(
      { conversationId: 7, content: 'hello' },
      socket,
    );

    expect(messagesService.sendMessage).toHaveBeenCalledWith(
      user,
      7,
      'hello',
      undefined,
      undefined,
    );
    expect(messagesService.markMessageAsDelivered).toHaveBeenCalledWith(10);
    expect(server.emit).toHaveBeenCalledWith('new_message', {
      id: 10,
      content: 'hello',
      status: 'delivered',
    });
    expect(socket.emit).toHaveBeenCalledWith('new_message', {
      id: 10,
      content: 'hello',
      status: 'delivered',
    });
    expect(result.status).toBe('delivered');
  });
});
