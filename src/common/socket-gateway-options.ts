import { buildCorsOriginHandler } from './cors.util';

const configuredOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : [];

const socketCorsOrigins = [...configuredOrigins];

if (
  process.env.SOCKET_ADMIN_ENABLED === 'true' &&
  !socketCorsOrigins.includes('https://admin.socket.io')
) {
  socketCorsOrigins.push('https://admin.socket.io');
}

export const socketGatewayOptions = {
  cors: {
    origin: buildCorsOriginHandler(socketCorsOrigins),
    credentials: true,
  },
};
