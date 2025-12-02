import fs from 'fs';
import path from 'path';

export default async function () {
  const pidFile = path.join(__dirname, '.server-pid');
  if (!fs.existsSync(pidFile)) return;
  const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
  try {
    process.kill(pid, 'SIGTERM');
  } catch (e) {
    console.error(e);
  }
  fs.unlinkSync(pidFile);
}
