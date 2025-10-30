import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { instrument } from '@socket.io/admin-ui';
import { AppModule } from './app.module';
import * as fs from 'fs';

config();

async function bootstrap() {
  // SSL/TLS configuration
  const getHttpsOptions = () => {
    if (process.env.NODE_ENV !== 'development') {
      return {
        key: fs.readFileSync(
          '/home/catholicpay2/ssl/keys/c83be_ae6cd_70e6faaa2f73d0802f48bdc44c29fc69.key',
        ),
        cert: fs.readFileSync(
          '/home/catholicpay2/ssl/certs/chat_api_catholicpay_org_c83be_ae6cd_1793270125_66debc160d2717c086b7c391e6e99092.crt',
        ),
      };
    }
    return {};
  };
  const httpsOptions = getHttpsOptions();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions,
  });

  app.enableCors();
  app.useStaticAssets('/home/assets', {
    prefix: '/assets/',
  });

  // Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription(
      'Real-time chat service API with WebSocket and REST endpoints',
    )
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

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ Application is running on: https://locahost:${port}`);
}
bootstrap();
