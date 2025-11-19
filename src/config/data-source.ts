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
  host: configService.get('MYSQL_HOST') || 'localhost',
  port: configService.get('MYSQL_PORT') || 3306,
  username: process.env.MYSQL_USER || '',
  password: process.env.MYSQL_PASS || '',
  database: process.env.MYSQL_DB || 'chatdb_test',
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/src/migrations/*{.ts,.js}'],
  synchronize: false, // Use migrations instead
  logging:
    configService.get('MYSQL_LOGGING') === 'true' ||
    (configService.get('MYSQL_LOGGING') !== 'false' &&
      configService.get('NODE_ENV') === 'development'),
  migrationsTableName: 'migrations',
});
