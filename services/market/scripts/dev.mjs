import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(serviceDir);

const serviceEnv = {
  ...process.env,
  SERVICE_NAME: process.env.SERVICE_NAME ?? 'market',
  DB_SCHEMA: process.env.DB_SCHEMA ?? 'market',
};

const children = new Set();

function spawnChild(command, args, extra = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: serviceEnv,
    cwd: projectDir,
    ...extra,
  });

  children.add(child);
  child.on('exit', () => {
    children.delete(child);
  });

  return child;
}

function stopChildren(signal = 'SIGTERM') {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

async function runInitialBuild() {
  await new Promise((resolve, reject) => {
    const build = spawnChild('pnpm', ['exec', 'tsc', '-p', 'tsconfig.build.json']);

    build.once('error', reject);
    build.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Initial market build failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopChildren(signal);
    process.exit(0);
  });
}

process.on('exit', () => {
  stopChildren();
});

try {
  await runInitialBuild();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Initial market build failed unexpectedly',
  );
  process.exit(1);
}

const buildWatch = spawnChild('pnpm', [
  'exec',
  'tsc',
  '-p',
  'tsconfig.build.json',
  '--watch',
  '--preserveWatchOutput',
]);

const server = spawnChild(process.execPath, ['--watch', '--env-file', '../../.env', 'dist/main.js']);

buildWatch.once('error', (error) => {
  console.error('Market build watcher failed to start:', error);
  stopChildren();
  process.exit(1);
});

server.once('error', (error) => {
  console.error('Market dev server failed to start:', error);
  stopChildren();
  process.exit(1);
});

server.once('exit', (code, signal) => {
  if (signal || code) {
    stopChildren();
    process.exit(code ?? 1);
  }
});
