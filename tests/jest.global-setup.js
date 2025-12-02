import { spawn } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../server/parseconfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = config.port || 3000;

export default async function () {
  const serverPath = path.join(__dirname, '..', 'server.js');
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const waitForPort = (port, retries = 30) =>
    new Promise((resolve, reject) => {
      const tryConnect = () => {
        const socket = net.createConnection({ port }, () => {
          socket.end();
          resolve();
        });
        socket.on('error', () => {
          if (retries <= 0) return reject(new Error('Port not open in time'));
          retries -= 1;
          setTimeout(tryConnect, 200);
        });
      };
      tryConnect();
    });

  await waitForPort(port, 30);
  // Save child pid for teardown
  const pidFile = path.join(__dirname, '.server-pid');
  fs.writeFileSync(pidFile, String(child.pid));
}
