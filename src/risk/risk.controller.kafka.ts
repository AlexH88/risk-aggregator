import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { RiskService } from './risk.service';

const RESPONSE_TOPICS = [
  'risk.system.1.response',
  'risk.system.2.response',
  'risk.system.3.response',
  'risk.system.4.response',
];

@Controller()
export class RiskKafkaController {
  private readonly logger = new Logger(RiskKafkaController.name);
  constructor(private readonly risk: RiskService) {}

  @EventPattern('risk.system.*.response')
  async onSystemResponse(@Payload() payload: any, @Ctx() ctx: KafkaContext) {
    this.risk.handleSystemResponse(payload);
  }
}