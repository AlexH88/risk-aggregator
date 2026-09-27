import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { KafkaModule } from './kafka/kafka.module';
import { LoggerModule } from './logger/logger.module';
import { MetricsModule } from './metrics/metrics.module';
import { RiskModule } from './risk/risk.module';
import { MockSystemsModule } from './mock-systems/mock-systems.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    LoggerModule,
    MetricsModule,
    PrismaModule,
    RedisModule,
    KafkaModule,
    RiskModule,
    MockSystemsModule,
  ],
})
export class AppModule {}