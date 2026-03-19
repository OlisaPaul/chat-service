import { PresenceStateService } from './presence-state.service';
import { RedisService } from '../realtime/redis.service';

describe('PresenceStateService', () => {
  let service: PresenceStateService;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    redisService = {
      isEnabled: jest.fn().mockReturnValue(false),
      getClient: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;
    service = new PresenceStateService(redisService);
  });

  it('only marks a user offline after their last socket disconnects', async () => {
    expect((await service.markOnline('socket-a', 'appA:alice')).becameOnline).toBe(true);
    expect((await service.markOnline('socket-b', 'appA:alice')).becameOnline).toBe(false);

    expect(await service.getOnlineUsersCount()).toBe(1);
    expect(await service.hasOtherActiveSockets('appA:alice', 'socket-a')).toBe(true);

    expect(await service.markOffline('socket-a')).toEqual({
      externalId: 'appA:alice',
      becameOffline: false,
    });
    expect(await service.getOnlineUsersCount()).toBe(1);

    expect(await service.markOffline('socket-b')).toEqual({
      externalId: 'appA:alice',
      becameOffline: true,
    });
    expect(await service.getOnlineUsersCount()).toBe(0);
  });
});
