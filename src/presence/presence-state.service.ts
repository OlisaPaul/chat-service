import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceStateService {
  private readonly socketToUser = new Map<string, string>();
  private readonly userToSockets = new Map<string, Set<string>>();
  private readonly eventLog: Array<{
    timestamp: string;
    eventType: string;
    data: Record<string, unknown>;
  }> = [];

  markOnline(socketId: string, externalId: string, userName?: string) {
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

  markOffline(socketId: string) {
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

  getOnlineUserIds(): string[] {
    return Array.from(this.userToSockets.keys());
  }

  getOnlineUsersCount(): number {
    return this.getOnlineUserIds().length;
  }

  getOnlineUsersDetails(): Array<{ socketId: string; userId: string }> {
    return Array.from(this.socketToUser.entries()).map(([socketId, userId]) => ({
      socketId,
      userId,
    }));
  }

  hasOtherActiveSockets(externalId: string, excludingSocketId: string) {
    const sockets = this.userToSockets.get(externalId);
    if (!sockets) {
      return false;
    }

    return Array.from(sockets).some((socketId) => socketId !== excludingSocketId);
  }

  getRecentEvents(limit = 50) {
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
}
