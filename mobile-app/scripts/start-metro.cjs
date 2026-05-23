const {execFileSync} = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');

const PORT = 8081;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const POLL_INTERVAL_MS = 500;
const BUNDLE_HEALTHCHECK_PATH =
  '/index.bundle?platform=android&dev=true&lazy=true&minify=false&app=com.sensegrain.mobile&modulesOnly=false&runModule=true&excludeSource=true&sourcePaths=url-server';

function normalizeProjectRoot(projectRoot) {
  if (!projectRoot) {
    return undefined;
  }

  return path.normalize(projectRoot);
}

function checkMetroStatus() {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host: '127.0.0.1',
        port: PORT,
        path: '/status',
        timeout: 2000,
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          const projectHeader = response.headers['x-react-native-project-root'];
          resolve({
            ok: response.statusCode === 200 && body.trim() === 'packager-status:running',
            projectRoot:
              typeof projectHeader === 'string'
                ? normalizeProjectRoot(decodeURIComponent(projectHeader))
                : undefined,
          });
        });
      },
    );

    request.on('error', () => resolve({ok: false}));
    request.on('timeout', () => {
      request.destroy();
      resolve({ok: false});
    });
  });
}

function checkBundleHealth() {
  return new Promise((resolve) => {
    const request = http.get(
      {
        host: '127.0.0.1',
        port: PORT,
        path: BUNDLE_HEALTHCHECK_PATH,
        timeout: 30000,
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => {
          if (body.length < 4096) {
            body += chunk;
          }
        });
        response.on('end', () => {
          resolve({
            ok: response.statusCode === 200,
            statusCode: response.statusCode ?? 0,
            preview: body.trim(),
          });
        });
      },
    );

    request.on('error', error =>
      resolve({ok: false, statusCode: 0, preview: error instanceof Error ? error.message : ''}),
    );
    request.on('timeout', () => {
      request.destroy();
      resolve({ok: false, statusCode: 0, preview: 'Bundle healthcheck timed out.'});
    });
  });
}

function getPortPids() {
  try {
    const output = execFileSync('netstat', ['-ano', '-p', 'tcp'], {encoding: 'utf8'});
    const pids = new Set();

    for (const line of output.split(/\r?\n/)) {
      if (!line.includes(`:${PORT}`) || !line.includes('LISTENING')) {
        continue;
      }

      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) {
        pids.add(pid);
      }
    }

    return [...pids];
  } catch {
    return [];
  }
}

function getProcessName(pid) {
  try {
    const output = execFileSync(
      'tasklist',
      ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'],
      {encoding: 'utf8'},
    ).trim();

    if (!output || output.startsWith('INFO:')) {
      return null;
    }

    const firstField = output.split('","')[0];
    return firstField.replace(/^"/, '');
  } catch {
    return null;
  }
}

function stopStaleNodeOnMetroPort() {
  const pids = getPortPids();
  let stoppedAny = false;

  for (const pid of pids) {
    const processName = getProcessName(pid);
    if (!processName || processName.toLowerCase() !== 'node.exe') {
      continue;
    }

    try {
      execFileSync('taskkill', ['/PID', pid, '/F', '/T'], {stdio: 'ignore'});
      stoppedAny = true;
      console.log(`Stopped stale Metro process on port ${PORT} (PID ${pid}).`);
    } catch {
      // Ignore and let the next stage report a clear error if the port stays busy.
    }
  }

  return stoppedAny;
}

function waitForPortToClear() {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const poll = () => {
      const socket = net.connect({host: '127.0.0.1', port: PORT});

      socket.on('connect', () => {
        socket.destroy();
        if (Date.now() - startedAt >= 5000) {
          resolve(false);
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      });

      socket.on('error', () => resolve(true));
    };

    poll();
  });
}

async function main() {
  const status = await checkMetroStatus();

  if (status.ok && status.projectRoot === normalizeProjectRoot(PROJECT_ROOT)) {
    const bundleHealth = await checkBundleHealth();
    if (bundleHealth.ok) {
      console.log(`Metro is already running for this project on port ${PORT}.`);
      return;
    }

    console.log(`Restarting unhealthy Metro on port ${PORT}.`);
    if (bundleHealth.statusCode) {
      console.log(`Last bundle check returned HTTP ${bundleHealth.statusCode}.`);
    }
  }

  if (status.ok && status.projectRoot && status.projectRoot !== PROJECT_ROOT) {
    console.error(`Port ${PORT} is already being used by another React Native project.`);
    console.error(`Running project: ${status.projectRoot}`);
    process.exitCode = 1;
    return;
  }

  const stoppedStaleNode = stopStaleNodeOnMetroPort();
  if (stoppedStaleNode) {
    const cleared = await waitForPortToClear();
    if (!cleared) {
      console.error(`Port ${PORT} is still busy after stopping stale Node processes.`);
      process.exitCode = 1;
      return;
    }
  }

  execFileSync('cmd.exe', ['/d', '/s', '/c', 'npx.cmd react-native start'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
