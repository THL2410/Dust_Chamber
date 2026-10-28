
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { ServiceErrorsFilter } from './commons/filters/service.error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalFilters(new ServiceErrorsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Dust Settling Chamber Calculation API')
    .setDescription('API for dust settling chamber calculations')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Calculations')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get<number>('port') || 3000;

  await app.listen(port);

  console.log(
    `Application is running on: ${await app.getUrl()}/api-docs`,
  );
}

bootstrap().catch((err) => {
  console.error('Lỗi khởi động server:', err);
});
