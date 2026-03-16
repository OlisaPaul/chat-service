const defaultPort = process.env.PORT || '3001';
const configuredOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : [`http://localhost:${defaultPort}`, `http://127.0.0.1:${defaultPort}`];

const socketCorsOrigins = [...configuredOrigins];

if (
  process.env.SOCKET_ADMIN_ENABLED === 'true' &&
  !socketCorsOrigins.includes('https://admin.socket.io')
) {
  socketCorsOrigins.push('https://admin.socket.io');
}

export const socketGatewayOptions = {
  cors: {
    origin: socketCorsOrigins.includes('*') ? true : socketCorsOrigins,
    credentials: true,
  },
};
