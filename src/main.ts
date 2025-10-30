import {config} from 'dotenv'
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { instrument } from '@socket.io/admin-ui';
import { AppModule } from './app.module';

config()

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets('/home/assets', {
    prefix: '/assets/',
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

  // Socket.IO Admin UI will be configured in the PresenceGateway afterInit hook

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
