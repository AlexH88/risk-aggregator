import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService, ConfigModule } from '@nestjs/config';
import pino from 'pino';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const streams: pino.StreamEntry[] = [
          { level: 'info', stream: process.stdout },
        ];

        // GELF-стрим в Graylog
        try {
          const gelf = require('gelf-pro');
          gelf.setConfig({
            adapterName: 'udp',
            adapterOptions: {
              host: cfg.get('graylog.host'),
              port: cfg.get('graylog.port'),
            },
            fields: { app: 'risk-aggregator' },
          });
          streams.push({
            level: 'info',
            stream: {
              write: (line: string) => {
                try { gelf.info('app', JSON.parse(line)); } catch { /* noop */ }
              },
            } as any,
          });
        } catch (e) {
          // gelf-pro опционален
        }

        return {
          pinoHttp: { level: 'info', stream: pino.multistream(streams) },
        };
      },
    }),
  ],
})
export class LoggerModule {}