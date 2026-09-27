import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { KAFKA_CLIENT } from '../kafka/kafka.module';
import { CreateRiskDto } from './dto/create-risk.dto';
import { QueryHistoryDto } from './dto/query-history.dto';

const SYSTEMS = ['SYSTEM_1', 'SYSTEM_2', 'SYSTEM_3', 'SYSTEM_4'] as const;
type SystemName = typeof SYSTEMS[number];

interface SystemItem { inn: string; sum: number; }
interface SystemResponse { systemName: SystemName; items: SystemItem[]; }

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  // requestId -> resolver ожидающих ответов
  private pending = new Map<string, {
    expected: number;
    collected: SystemResponse[];
    resolve: (r: SystemResponse[]) => void;
    timer: NodeJS.Timeout;
  }>();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
    @Inject(KAFKA_CLIENT) private kafka: ClientKafka,
  ) {}

  // --- Публичный API ---

  async calculate(dto: CreateRiskDto) {
    const requestId = randomUUID();
    const cacheKey = this.buildCacheKey(dto.inns);

    const cached = await this.redis.get<any>(cacheKey);
    if (cached) {
      this.logger.log(`Cache HIT for ${cacheKey}`);
      const saved = await this.persist(requestId, dto.inns, cached.systems, true);
      return { ...saved, cached: true };
    }

    // 1. Создаём запись истории со статусом PENDING
    await this.prisma.riskRequest.create({
      data: {
        id: requestId,
        inns: dto.inns,
        status: 'PENDING',
        innsIndex: { create: dto.inns.map(inn => ({ inn })) },
      },
    });

    // 2. Ждём ответы от 4 систем
    const responses = await this.dispatchToSystems(requestId, dto.inns);

    // 3. Считаем итоги
    const systems = responses.map(r => ({
      systemName: r.systemName,
      totalSum: r.items.reduce((s, i) => s + i.sum, 0),
      items: r.items,
    }));
    const totalSum = systems.reduce((s, x) => s + x.totalSum, 0);

    // 4. Сохраняем финал
    await this.prisma.riskRequest.update({
      where: { id: requestId },
      data: {
        status: 'DONE',
        totalSum,
        systems: {
          create: systems.map(s => ({
            systemName: s.systemName,
            totalSum: s.totalSum,
            items: s.items,
          })),
        },
      },
    });

    // 5. Кэш
    await this.redis.set(cacheKey, { systems, totalSum }, 300);

    return { requestId, inns: dto.inns, systems, totalSum, cached: false };
  }

  async history(q: QueryHistoryDto) {
    const where: any = {};
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }
    if (q.inn) where.innsIndex = { some: { inn: q.inn } };

    const [items, total] = await Promise.all([
      this.prisma.riskRequest.findMany({
        where,
        include: { systems: true },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.riskRequest.count({ where }),
    ]);

    return { items, total, page: q.page, limit: q.limit };
  }

  async getById(id: string) {
    const item = await this.prisma.riskRequest.findUnique({
      where: { id }, include: { systems: true },
    });
    if (!item) throw new NotFoundException('Запрос не найден');
    return item;
  }

  // --- Внутреннее ---

  private async dispatchToSystems(requestId: string, inns: string[]): Promise<SystemResponse[]> {
    return new Promise<SystemResponse[]>((resolve) => {
      const timer = setTimeout(() => {
        this.logger.warn(`Timeout waiting for systems, requestId=${requestId}`);
        const entry = this.pending.get(requestId);
        this.pending.delete(requestId);
        resolve(entry?.collected ?? []);
      }, 10_000);

      this.pending.set(requestId, {
        expected: SYSTEMS.length,
        collected: [],
        resolve,
        timer,
      });

      for (const system of SYSTEMS) {
        const topic = `risk.${system.toLowerCase().replace('_', '.')}.request`;
        this.kafka.emit(topic, { requestId, systemName: system, inns });
        this.logger.log(`→ ${topic} requestId=${requestId}`);
      }
    });
  }

  /**
   * Вызывается Kafka-консьюмером, когда приходит ответ от системы.
   */
  handleSystemResponse(payload: { requestId: string } & SystemResponse) {
    const entry = this.pending.get(payload.requestId);
    if (!entry) return; // уже завершён или таймаут

    entry.collected.push({
      systemName: payload.systemName,
      items: payload.items,
    });
    this.logger.log(`← response from ${payload.systemName} requestId=${payload.requestId} (${entry.collected.length}/${entry.expected})`);

    if (entry.collected.length >= entry.expected) {
      clearTimeout(entry.timer);
      this.pending.delete(payload.requestId);
      entry.resolve(entry.collected);
    }
  }

  private buildCacheKey(inns: string[]) {
    return `risk:calc:${[...inns].sort().join(',')}`;
  }

  private async persist(requestId: string, inns: string[], agg: any, cached: boolean) {
    // при cache-hit всё равно пишем запись в историю
    const exists = await this.prisma.riskRequest.findUnique({ where: { id: requestId } });
    if (exists) return exists;
    return this.prisma.riskRequest.create({
      data: {
        id: requestId,
        inns,
        status: 'DONE',
        totalSum: agg.totalSum,
        innsIndex: { create: inns.map(inn => ({ inn })) },
        systems: {
          create: agg.systems.map((s: any) => ({
            systemName: s.systemName,
            totalSum: s.totalSum,
            items: s.items,
          })),
        },
      },
      include: { systems: true },
    });
  }
}