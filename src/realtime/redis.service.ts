import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClient | null = null;
  private publisher: RedisClient | null = null;
  private subscriber: RedisClient | null = null;
  private initializing: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {}

  isEnabled() {
    return this.configService.get<boolean>('realtime.redis.enabled') ?? false;
  }

  async getClient() {
    if (!this.isEnabled()) {
      return null;
    }

    await this.ensureInitialized();
    return this.client;
  }

  async getPublisher() {
    if (!this.isEnabled()) {
      return null;
    }

    await this.ensureInitialized();
    return this.publisher;
  }

  async getSubscriber() {
    if (!this.isEnabled()) {
      return null;
    }

    await this.ensureInitialized();
    return this.subscriber;
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.client?.quit(),
      this.publisher?.quit(),
      this.subscriber?.quit(),
    ]);
  }

  private async ensureInitialized() {
    if (this.client && this.publisher && this.subscriber) {
      return;
    }

    if (!this.initializing) {
      this.initializing = this.initialize();
    }

    await this.initializing;
  }

  private async initialize() {
    const url = this.configService.get<string>('realtime.redis.url');
    const host = this.configService.get<string>('realtime.redis.host') ?? 'localhost';
    const port = this.configService.get<number>('realtime.redis.port') ?? 6379;
    const password = this.configService.get<string>('realtime.redis.password') ?? undefined;

    const baseClient = createClient({
      url: url || undefined,
      socket: url
        ? undefined
        : {
            host,
            port,
          },
      password,
    });

    baseClient.on('error', (error) => {
      this.logger.error(`Redis client error: ${error.message}`);
    });

    await baseClient.connect();
    this.client = baseClient;
    this.publisher = this.client.duplicate();
    this.subscriber = this.client.duplicate();
    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
    this.logger.log('Redis realtime clients connected');
  }
}
