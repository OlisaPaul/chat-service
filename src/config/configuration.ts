export default () => ({
  app: {
    port: parseInt(process.env.PORT || '3001', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
      : ['*'],
  },
  database: {
    type: 'mysql' as const,
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    username: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASS || '',
    database: process.env.MYSQL_DB || 'chatdb',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging:
      process.env.MYSQL_LOGGING === 'true' ||
      (process.env.MYSQL_LOGGING !== 'false' &&
        process.env.NODE_ENV === 'development'),
    connectTimeout: 60000,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    extra: {
      connectionLimit: 10,
      queueLimit: 0,
    },
  },
  auth: {
    jwtSecret:
      process.env.JWT_SHARED_SECRET || process.env.JWT_SECRET || 'default-secret',
    claims: {
      subject: process.env.AUTH_SUB_CLAIM || 'sub',
      name: process.env.AUTH_NAME_CLAIM || 'name',
      avatarUrl: process.env.AUTH_AVATAR_CLAIM || 'avatarUrl',
      role: process.env.AUTH_ROLE_CLAIM || 'role',
    },
    roleAuthorizationEnabled:
      process.env.AUTH_ROLE_AUTHORIZATION_ENABLED === 'true',
  },
  features: {
    chat: process.env.FEATURE_CHAT !== 'false',
    uploads: process.env.FEATURE_UPLOADS !== 'false',
    presence: process.env.FEATURE_PRESENCE !== 'false',
    calls: process.env.FEATURE_CALLS !== 'false',
  },
  uploads: {
    path: process.env.UPLOAD_PATH || '/home/assets/chat/uploads',
    assetsPath: process.env.ASSETS_PATH || '/home/assets',
    maxFileSizeBytes: parseInt(
      process.env.UPLOAD_MAX_FILE_SIZE_BYTES || `${50 * 1024 * 1024}`,
      10,
    ),
  },
  rtc: {
    stunUrls: process.env.RTC_STUN_URLS
      ? process.env.RTC_STUN_URLS.split(',').map((value) => value.trim())
      : ['stun:stun.l.google.com:19302'],
    turnUrls: process.env.RTC_TURN_URLS
      ? process.env.RTC_TURN_URLS.split(',').map((value) => value.trim())
      : [],
    turnUsername: process.env.RTC_TURN_USERNAME || '',
    turnPassword: process.env.RTC_TURN_PASSWORD || '',
    iceTransportPolicy: process.env.RTC_ICE_TRANSPORT_POLICY || 'all',
  },
  socketAdmin: {
    enabled: process.env.SOCKET_ADMIN_ENABLED !== 'false',
    authEnabled: process.env.SOCKET_ADMIN_AUTH_ENABLED === 'true',
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
});
