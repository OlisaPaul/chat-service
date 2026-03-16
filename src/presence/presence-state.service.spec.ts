import { PresenceStateService } from './presence-state.service';

describe('PresenceStateService', () => {
  let service: PresenceStateService;

  beforeEach(() => {
    service = new PresenceStateService();
  });

  it('only marks a user offline after their last socket disconnects', () => {
    expect(service.markOnline('socket-a', 'appA:alice').becameOnline).toBe(true);
    expect(service.markOnline('socket-b', 'appA:alice').becameOnline).toBe(false);

    expect(service.getOnlineUsersCount()).toBe(1);
    expect(service.hasOtherActiveSockets('appA:alice', 'socket-a')).toBe(true);

    expect(service.markOffline('socket-a')).toEqual({
      externalId: 'appA:alice',
      becameOffline: false,
    });
    expect(service.getOnlineUsersCount()).toBe(1);

    expect(service.markOffline('socket-b')).toEqual({
      externalId: 'appA:alice',
      becameOffline: true,
    });
    expect(service.getOnlineUsersCount()).toBe(0);
  });
});
