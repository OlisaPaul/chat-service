import { Injectable } from '@nestjs/common';

@Injectable()
export class PresenceStateService {
  private readonly onlineUsers = new Map<string, string>();
  private readonly eventLog: Array<{
    timestamp: string;
    eventType: string;
    data: Record<string, unknown>;
  }> = [];

  markOnline(socketId: string, externalId: string, userName?: string) {
    this.onlineUsers.set(socketId, externalId);
    this.logEvent('user_online', { userId: externalId, userName });
  }

  markOffline(socketId: string) {
    const externalId = this.onlineUsers.get(socketId);
    if (!externalId) {
      return null;
    }

    this.onlineUsers.delete(socketId);
    this.logEvent('user_offline', { userId: externalId });
    return externalId;
  }

  getOnlineUserIds(): string[] {
    return Array.from(new Set(this.onlineUsers.values()));
  }

  getOnlineUsersCount(): number {
    return this.getOnlineUserIds().length;
  }

  getOnlineUsersDetails(): Array<{ socketId: string; userId: string }> {
    return Array.from(this.onlineUsers.entries()).map(([socketId, userId]) => ({
      socketId,
      userId,
    }));
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
