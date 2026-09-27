import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'risk_calculations_total',
      help: 'Total number of risk calculations',
      labelNames: ['cached'],
    }),
    makeHistogramProvider({
      name: 'risk_calculation_duration_seconds',
      help: 'Duration of risk calculation',
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    }),
    makeCounterProvider({
      name: 'risk_system_responses_total',
      help: 'Responses per system',
      labelNames: ['system', 'status'],
    }),
  ],
  exports: ['PROM_METRIC_RISK_CALCULATIONS_TOTAL',
            'PROM_METRIC_RISK_CALCULATION_DURATION_SECONDS',
            'PROM_METRIC_RISK_SYSTEM_RESPONSES_TOTAL'],
})
export class MetricsModule {}