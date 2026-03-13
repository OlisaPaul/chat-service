/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-require-imports */
require('dotenv').config();
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import configuration from './configuration';

// Import entities using glob patterns to avoid TypeScript compilation issues

// Import migrations
// import { InitialDatabaseSetup1737200174000 } from '../migrations/1737200174000-InitialDatabaseSetup';

const configService = new ConfigService(configuration());

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: configService.get('database.host') || 'localhost',
  port: configService.get('database.port') || 3306,
  username: configService.get('database.username') || '',
  password: configService.get('database.password') || '',
  database: configService.get('database.database') || 'chatdb',
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/src/migrations/*{.ts,.js}'],
  synchronize: false, // Use migrations instead
  logging:
    configService.get('database.logging') === true ||
    (configService.get('database.logging') !== false &&
      configService.get('NODE_ENV') === 'development'),
  migrationsTableName: 'migrations',
});
