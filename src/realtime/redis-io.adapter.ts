import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import { RedisService } from './redis.service';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplicationContext,
    private readonly redisService: RedisService,
  ) {
    super(app);
  }

  async connectToRedis() {
    if (!this.redisService.isEnabled()) {
      return;
    }

    const publisher = await this.redisService.getPublisher();
    const subscriber = await this.redisService.getSubscriber();

    if (!publisher || !subscriber) {
      return;
    }

    this.adapterConstructor = createAdapter(publisher, subscriber);
    this.logger.log('Socket.IO Redis adapter enabled');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
