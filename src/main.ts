import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Risk Aggregator API')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  // Kafka microservice — слушает ответы
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'risk-aggregator-consumer',
        brokers: (process.env.KAFKA_BROKERS || '').split(','),
      },
      consumer: {
        groupId: 'risk-aggregator-responses',
        allowAutoTopicCreation: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3000);
  console.log(`HTTP: http://localhost:${process.env.PORT}/docs`);
}
bootstrap();