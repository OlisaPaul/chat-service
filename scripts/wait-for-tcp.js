const net = require('net');

const host = process.argv[2];
const port = Number(process.argv[3]);
const timeoutSeconds = Number(process.argv[4] || 60);

if (!host || !port) {
  console.error('Usage: node scripts/wait-for-tcp.js <host> <port> [timeoutSeconds]');
  process.exit(1);
}

const startedAt = Date.now();

function tryConnect() {
  const socket = net.createConnection({ host, port });

  socket.once('connect', () => {
    socket.destroy();
    console.log(`TCP service reachable at ${host}:${port}`);
    process.exit(0);
  });

  socket.once('error', () => {
    socket.destroy();

    if (Date.now() - startedAt >= timeoutSeconds * 1000) {
      console.error(`Timed out waiting for ${host}:${port}`);
      process.exit(1);
    }

    setTimeout(tryConnect, 1000);
  });
}

tryConnect();
