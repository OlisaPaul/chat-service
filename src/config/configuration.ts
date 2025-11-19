export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    type: 'mysql' as const,
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || '',
    database: process.env.MYSQL_DB || 'chatdb_test',
    synchronize: false,
    logging:
      process.env.MYSQL_LOGGING === 'true' ||
      (process.env.MYSQL_LOGGING !== 'false' &&
        process.env.NODE_ENV === 'development'),
    entities:
      process.env.NODE_ENV === 'production'
        ? ['dist/**/*.entity.js']
        : ['dist/**/*.entity.js'],
    // Connection pool and timeout settings
    connectTimeout: 60000, // 60 seconds
    // Charset and collation settings
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    // Connection pool settings
    extra: {
      connectionLimit: 10,
      queueLimit: 0,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: process.env.EMAIL_FROM || 'noreply@abujafmp.com',
  },
});
