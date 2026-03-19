import { Injectable } from '@nestjs/common';
import { RedisService } from '../realtime/redis.service';

const SOCKET_USERS_KEY = 'presence:socket-users';
const ONLINE_USERS_KEY = 'presence:online-users';
const EVENT_LOG_KEY = 'presence:event-log';

@Injectable()
export class PresenceStateService {
  private readonly socketToUser = new Map<string, string>();
  private readonly userToSockets = new Map<string, Set<string>>();
  private readonly eventLog: Array<{
    timestamp: string;
    eventType: string;
    data: Record<string, unknown>;
  }> = [];
  constructor(private readonly redisService: RedisService) {}

  async markOnline(socketId: string, externalId: string, userName?: string) {
    if (this.redisService.isEnabled()) {
      const client = await this.redisService.getClient();
      if (client) {
        const userSocketsKey = this.getUserSocketsKey(externalId);
        const currentSocketCount = await client.sCard(userSocketsKey);

        await client.hSet(SOCKET_USERS_KEY, socketId, externalId);
        await client.sAdd(userSocketsKey, socketId);
        await client.sAdd(ONLINE_USERS_KEY, externalId);

        const becameOnline = currentSocketCount === 0;
        if (becameOnline) {
          await this.logRedisEvent('user_online', { userId: externalId, userName });
        }

        return { externalId, becameOnline };
      }
    }

    const existingSockets = this.userToSockets.get(externalId) ?? new Set<string>();
    const wasOffline = existingSockets.size === 0;

    existingSockets.add(socketId);
    this.userToSockets.set(externalId, existingSockets);
    this.socketToUser.set(socketId, externalId);

    if (wasOffline) {
      this.logEvent('user_online', { userId: externalId, userName });
    }

    return { externalId, becameOnline: wasOffline };
  }

  async markOffline(socketId: string) {
    if (this.redisService.isEnabled()) {
      const client = await this.redisService.getClient();
      if (client) {
        const externalId = await client.hGet(SOCKET_USERS_KEY, socketId);
        if (!externalId) {
          return null;
        }

        const userSocketsKey = this.getUserSocketsKey(externalId);
        await client.hDel(SOCKET_USERS_KEY, socketId);
        await client.sRem(userSocketsKey, socketId);
        const remainingSockets = await client.sCard(userSocketsKey);

        const becameOffline = remainingSockets === 0;
        if (becameOffline) {
          await client.sRem(ONLINE_USERS_KEY, externalId);
          await client.del(userSocketsKey);
          await this.logRedisEvent('user_offline', { userId: externalId });
        }

        return { externalId, becameOffline };
      }
    }

    const externalId = this.socketToUser.get(socketId);
    if (!externalId) {
      return null;
    }

    this.socketToUser.delete(socketId);

    const existingSockets = this.userToSockets.get(externalId);
    if (!existingSockets) {
      return null;
    }

    existingSockets.delete(socketId);
    const becameOffline = existingSockets.size === 0;

    if (becameOffline) {
      this.userToSockets.delete(externalId);
      this.logEvent('user_offline', { userId: externalId });
    }

    return { externalId, becameOffline };
  }

  async getOnlineUserIds(): Promise<string[]> {
    if (this.redisService.isEnabled()) {
      const client = await this.redisService.getClient();
      if (client) {
        return client.sMembers(ONLINE_USERS_KEY);
      }
    }

    return Array.from(this.userToSockets.keys());
  }

  async getOnlineUsersCount(): Promise<number> {
    if (this.redisService.isEnabled()) {
      const client = await this.redisService.getClient();
      if (client) {
        return client.sCard(ONLINE_USERS_KEY);
      }
    }

    return (await this.getOnlineUserIds()).length;
  }

  async getOnlineUsersDetails(): Promise<Array<{ socketId: string; userId: string }>> {
    if (this.redisService.isEnabled()) {
      const client = await this.redisService.getClient();
      if (client) {
        const socketUsers = await client.hGetAll(SOCKET_USERS_KEY);
        return Object.entries(socketUsers as Record<string, string>).map(([socketId, userId]) => ({
          socketId,
          userId,
        }));
      }
    }

    return Array.from(this.socketToUser.entries()).map(([socketId, userId]) => ({
      socketId,
      userId,
    }));
  }

  async hasOtherActiveSockets(externalId: string, excludingSocketId: string) {
    if (this.redisService.isEnabled()) {
      const client = await this.redisService.getClient();
      if (client) {
        const sockets = await client.sMembers(this.getUserSocketsKey(externalId));
        return sockets.some((socketId) => socketId !== excludingSocketId);
      }
    }

    const sockets = this.userToSockets.get(externalId);
    if (!sockets) {
      return false;
    }

    return Array.from(sockets).some((socketId) => socketId !== excludingSocketId);
  }

  async getRecentEvents(limit = 50) {
    if (this.redisService.isEnabled()) {
      const client = await this.redisService.getClient();
      if (client) {
        const entries = await client.lRange(EVENT_LOG_KEY, 0, Math.max(limit - 1, 0));
        return entries
          .map((entry) => {
            try {
              return JSON.parse(entry) as {
                timestamp: string;
                eventType: string;
                data: Record<string, unknown>;
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean);
      }
    }

    return this.eventLog.slice(-limit);
  }

  private logEvent(eventType: string, data: Record<string, unknown>) {
    this.eventLog.push({
      timestamp: new Date().toISOString(),
      eventType,
      data,
    });

    if (this.eventLog.length > 100) {
      this.eventLog.shift();
    }
  }

  private async logRedisEvent(eventType: string, data: Record<string, unknown>) {
    const client = await this.redisService.getClient();
    if (!client) {
      return;
    }

    await client.lPush(
      EVENT_LOG_KEY,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        eventType,
        data,
      }),
    );
    await client.lTrim(EVENT_LOG_KEY, 0, 99);
  }

  private getUserSocketsKey(externalId: string) {
    return `presence:user-sockets:${externalId}`;
  }
}
