import {config} from 'dotenv'
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

config()

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.useStaticAssets('/home/assets', {
    prefix: '/assets/',
  });
  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();
