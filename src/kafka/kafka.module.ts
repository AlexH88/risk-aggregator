import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const KAFKA_CLIENT = 'KAFKA_CLIENT';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KAFKA_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: cfg.get<string>('kafka.clientId') ?? 'risk-aggregator',
              brokers: cfg.get<string[]>('kafka.brokers') ?? ['localhost:9092'],
            },
            producer: { allowAutoTopicCreation: true },
            consumer: { groupId: 'risk-aggregator-producer' },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class KafkaModule {}