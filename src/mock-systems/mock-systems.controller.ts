import { Controller, Inject, Logger } from '@nestjs/common';
import { ClientKafka, EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_CLIENT } from '../kafka/kafka.module';

const MOCK_CONFIG: Record<string, { topic: string; min: number; max: number; failRate: number }> = {
  SYSTEM_1: { topic: 'risk.system.1', min: 1_000, max: 500_000, failRate: 0 },
  SYSTEM_2: { topic: 'risk.system.2', min: 5_000, max: 1_000_000, failRate: 0 },
  SYSTEM_3: { topic: 'risk.system.3', min: 0, max: 250_000, failRate: 0 },
  SYSTEM_4: { topic: 'risk.system.4', min: 10_000, max: 750_000, failRate: 0 },
};

@Controller()
export class MockSystemsController {
  private readonly logger = new Logger(MockSystemsController.name);

  constructor(@Inject(KAFKA_CLIENT) private kafka: ClientKafka) {}

  @EventPattern('risk.system.*.request')
  async handle(@Payload() payload: { requestId: string; systemName: string; inns: string[] }) {
    const cfg = MOCK_CONFIG[payload.systemName];
    if (!cfg) return;

    // имитация задержки
    await new Promise(r => setTimeout(r, 100 + Math.random() * 400));

    const items = payload.inns.map(inn => ({
      inn,
      sum: Math.round(cfg.min + Math.random() * (cfg.max - cfg.min)),
    }));

    const topic = `${cfg.topic}.response`;
    this.kafka.emit(topic, { requestId: payload.requestId, systemName: payload.systemName, items });
    this.logger.log(`Mock ${payload.systemName} → ${topic} requestId=${payload.requestId}`);
  }
}