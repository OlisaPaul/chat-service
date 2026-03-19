const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT_DIR, '.env') });

const BACKEND_PORT = Number(process.env.PORT || 3001);
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN;
const NGROK_BIN = path.join(
  ROOT_DIR,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'ngrok.cmd' : 'ngrok',
);

let backendProcess = null;
let ngrokProcess = null;

function isPortReachable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('error', () => {
      resolve(false);
    });
  });
}

async function waitForPort(port, label, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortReachable(port)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`${label} did not become reachable on port ${port} within ${timeoutMs}ms.`);
}

function spawnLogged(command, args, label, options = {}) {
  const child = spawn(command, args, {
    cwd: ROOT_DIR,
    shell: process.platform === 'win32',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`[${label}] ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`[${label}] ${data}`);
  });

  return child;
}

async function killLocalNgrokProcesses() {
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const child = spawn('taskkill', ['/IM', 'ngrok.exe', '/F'], {
        cwd: ROOT_DIR,
        shell: true,
        stdio: ['ignore', 'ignore', 'ignore'],
      });

      child.once('exit', () => resolve());
    });
    return;
  }

  await new Promise((resolve) => {
    const child = spawn('pkill', ['-f', 'ngrok'], {
      cwd: ROOT_DIR,
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    child.once('exit', () => resolve());
  });
}

function startBackendIfNeeded() {
  backendProcess = spawnLogged('npm', ['run', 'start:dev'], 'backend');

  backendProcess.once('exit', (code) => {
    if (code !== 0) {
      console.error(`\nBackend process exited with code ${code}.`);
    }
  });
}

async function runNgrokConfig() {
  await new Promise((resolve, reject) => {
    const child = spawn(NGROK_BIN, ['config', 'add-authtoken', NGROK_AUTHTOKEN], {
      cwd: ROOT_DIR,
      shell: process.platform === 'win32',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `ngrok config exited with code ${code}`));
    });
  });
}

async function startNgrokTunnel() {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Timed out waiting for ngrok tunnel URL.'));
      }
    }, 30000);

    ngrokProcess = spawn(
      NGROK_BIN,
      ['http', String(BACKEND_PORT), '--log', 'stdout'],
      {
        cwd: ROOT_DIR,
        shell: process.platform === 'win32',
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const handleOutput = (chunk, writeTo) => {
      const text = chunk.toString();
      writeTo(text);

      const match = text.match(/https:\/\/[a-z0-9.-]+\.ngrok-free\.app/i);
      if (match && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(match[0]);
      }
    };

    ngrokProcess.stdout.on('data', (data) => {
      handleOutput(data, (text) => process.stdout.write(`[ngrok] ${text}`));
    });

    ngrokProcess.stderr.on('data', (data) => {
      handleOutput(data, (text) => process.stderr.write(`[ngrok] ${text}`));
    });

    ngrokProcess.once('exit', (code) => {
      if (settled) {
        if (code !== 0) {
          console.error(`\nngrok process exited with code ${code}.`);
        }
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(new Error(`ngrok process exited with code ${code}.`));
    });
  });
}

async function cleanup() {
  if (ngrokProcess && !ngrokProcess.killed) {
    ngrokProcess.kill();
  }

  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
}

async function main() {
  if (!NGROK_AUTHTOKEN) {
    throw new Error(
      'NGROK_AUTHTOKEN is required. Add it to your shell or .env before running npm run tunnel:dev.',
    );
  }

  const backendAlreadyRunning = await isPortReachable(BACKEND_PORT);

  if (backendAlreadyRunning) {
    console.log(`Using existing backend on http://localhost:${BACKEND_PORT}`);
  } else {
    console.log(`Starting backend on http://localhost:${BACKEND_PORT} ...`);
    startBackendIfNeeded();
    await waitForPort(BACKEND_PORT, 'Backend');
  }

  console.log(`Reference frontend available at http://localhost:${BACKEND_PORT}/frontend/index.html`);
  console.log('Configuring ngrok...');
  await killLocalNgrokProcesses();
  await runNgrokConfig();

  console.log('Opening public tunnel...');
  const publicUrl = await startNgrokTunnel();
  const remoteFrontendUrl = `${publicUrl}/frontend/index.html`;

  console.log('\nTunnel setup ready:\n');
  console.log(`Backend tunnel:  ${publicUrl}`);
  console.log(`Remote test URL: ${remoteFrontendUrl}\n`);
  console.log('Open the remote test URL on the other device.');
  console.log('Keep this terminal running while you test. Press Ctrl+C to stop everything.\n');
}

process.on('SIGINT', async () => {
  console.log('\nShutting down tunnel and local processes...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

main().catch(async (error) => {
  console.error('\nFailed to start tunnel setup:', error.message);
  await cleanup();
  process.exit(1);
});
