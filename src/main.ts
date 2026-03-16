import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api/v1';
  const assetsPath =
    configService.get<string>('uploads.assetsPath') ?? '/home/assets';
  const port = configService.get<number>('app.port') ?? 3001;
  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? ['*'];

  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.setGlobalPrefix(apiPrefix);
  app.useStaticAssets(assetsPath, {
    prefix: '/api/v1/assets/',
  });
  app.useStaticAssets(join(process.cwd(), 'frontend'), {
    prefix: '/frontend/',
  });

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription('Real-time chat service API with WebSocket and REST endpoints')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port, '0.0.0.0');
}
bootstrap();
