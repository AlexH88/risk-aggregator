import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public readonly client: Redis;
  constructor(config: ConfigService) {
    this.client = new Redis({
      host: config.get('redis.host'),
      port: config.get('redis.port'),
    });
  }
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  async set(key: string, value: unknown, ttlSec = 300) {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSec);
  }
  onModuleDestroy() { this.client.disconnect(); }
}