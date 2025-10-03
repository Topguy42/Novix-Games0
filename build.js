// build.js
import { promises as fs } from 'fs';
import fse from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec as execCb, execSync } from 'child_process';
import sharp from 'sharp';
import os from 'os';
import util from 'util';

const exec = util.promisify(execCb);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projdir = __dirname;

// --- Submodules configuration (mirrors .gitmodules and bash array)
const Submodules = [
  'scramjet',
  'ultraviolet',
  'bare-mux',
  'libcurl-transport',
  'epoxy',
  'wisp-client-js',
  'bare-server-node',
  'wisp-server-node'
];

// --- Build commands ---
const buildCommands = {
  'scramjet': 'pnpm install && npm run rewriter:build && npm run build:all',
  'ultraviolet': 'pnpm install && pnpm run build',
  'bare-mux': 'pnpm install && pnpm run build',
  'epoxy': 'pnpm install && pnpm run build',
  'libcurl-transport': 'pnpm install && pnpm run build',
  'wisp-client-js': 'npm install && npm run build',
  'bare-server-node': 'pnpm install && pnpm run build',
  'wisp-server-node': 'pnpm install && pnpm build'
};

// --- Asset building ---
const INPUT_IMAGES = path.join(projdir, 'inputimages');
const INPUT_VECTORS = path.join(projdir, 'inputvectors');
const OUTPUT_OPTIMG = path.join(projdir, 'public', 'optimg');
const OUTPUT_OUTVECT = path.join(projdir, 'public', 'outvect');

// Raster formats to generate
const RASTER_TARGETS = [
  { ext: '.avif', opts: (img) => img.avif({ quality: 80 }) },
  { ext: '.webp', opts: (img) => img.webp({ quality: 80 }) },
  { ext: '.jpg',  opts: (img) => img.jpeg({ quality: 80 }) },
  { ext: '.png',  opts: (img) => img.png() }
];

// Recognized raster inputs (will be processed via sharp)
const RASTER_INPUT_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp', '.avif'];

// Recognized vector inputs (will be copied and rasterized via sharp)
const VECTOR_INPUT_EXTS = ['.svg', '.pdf'];

function logSection(title) {
  const bar = '-'.repeat(Math.max(10, title.length));
  console.log(`\n${bar}\n${title}\n${bar}`);
}

async function ensureSubmodules() {
  logSection('Checking git submodules');
  let missing = false;
  for (const name of Submodules) {
    const dir = path.join(projdir, 'external', name);
    const exists = await fse.pathExists(dir);
    if (!exists) {
      missing = true;
      break;
    }
  }

  if (missing) {
    console.log('Not all submodules found, installing...');
    await exec('git submodule update --init --recursive', { cwd: projdir });
  } else {
    console.log('All submodules exist, continuing...');
  }
}

function checkWSL() {
  try {
    const output = execSync('wsl.exe --list --quiet', { stdio: 'pipe' }).toString();
    const distros = output.split('\n').map(line => line.trim()).filter(Boolean);
    if (distros.length === 0) {
      throw new Error('WSL is installed but no distros found.');
    }
    console.log(`WSL distros detected: ${distros.join(', ')}`);
  } catch (err) {
    throw new Error('WSL is not installed or inaccessible. Details: ' + err.message);
  }
}


function wrapCommandForWSL(command, cwd) {
  if (os.platform() !== 'win32') return command;
  console.log("Windows detected, checking WSL...")
  checkWSL();

  // Convert Windows path to WSL path
  const wslPath = cwd.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/mnt/$1').toLowerCase();
  return `wsl bash -c "cd '${wslPath}' && ${command}"`;
}

async function buildSubmodules() {
  for (const name of Submodules) {
    logSection(`Building ${name}`);
    const subdir = path.join(projdir, 'external', name);
    const buildcommand = buildCommands[name];
    if (!buildcommand) {
      console.warn(`No build command found for ${name}; skipping.`);
      continue;
    }

    const wrapped = wrapCommandForWSL(buildcommand, subdir);
    await exec(wrapped, { shell: true, env: { ...process.env, RELEASE: '1' } });
  }
}


function shouldProcess(ext, validExts) {
  return validExts.includes(ext.toLowerCase());
}

async function convertRasterFile(inputPath, baseDir, outBase) {
  const ext = path.extname(inputPath).toLowerCase();
  const rel = path.relative(baseDir, inputPath);
  const relNoExt = rel.slice(0, -ext.length);

  // Always copy original file into output
  const copyDest = path.join(outBase, rel);
  await fse.ensureDir(path.dirname(copyDest));
  await fse.copyFile(inputPath, copyDest);
  console.log(`Copied original: ${path.relative(outBase, copyDest)}`);

  // Convert to all targets except same-format
  const buffer = await fs.readFile(inputPath);
  const image = sharp(buffer);

  for (const target of RASTER_TARGETS) {
    if (target.ext === ext) {
      // Skip same-format conversion
      continue;
    }
    const outPath = path.join(outBase, relNoExt + target.ext);
    await fse.ensureDir(path.dirname(outPath));
    await target.opts(image.clone()).toFile(outPath);
    console.log(`${rel} → ${path.relative(outBase, outPath)}`);
  }
}

async function copyVectorOriginal(inputPath, baseDir, outBase) {
  const rel = path.relative(baseDir, inputPath);
  const dest = path.join(outBase, rel);
  await fse.ensureDir(path.dirname(dest));
  await fse.copyFile(inputPath, dest);
  console.log(`Copied vector: ${path.relative(outBase, dest)}`);
}

async function rasterizeVectorFallbacks(inputPath, baseDir, outBase) {
  const ext = path.extname(inputPath).toLowerCase();
  const rel = path.relative(baseDir, inputPath);
  const relNoExt = rel.slice(0, -ext.length);

  const buffer = await fs.readFile(inputPath);
  const image = sharp(buffer);

  for (const target of RASTER_TARGETS) {
    const outPath = path.join(outBase, relNoExt + target.ext);
    await fse.ensureDir(path.dirname(outPath));
    await target.opts(image.clone()).toFile(outPath);
    console.log(`${rel} → ${path.relative(outBase, outPath)}`);
  }
}
async function walk(dir, handler) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        await handler(full);
      }
    }
  }
}

async function processInputImages() {
  logSection('Processing raster images (/inputimages → /public/optimg)');
  const exists = await fse.pathExists(INPUT_IMAGES);
  if (!exists) {
    console.warn('inputimages directory not found; skipping raster pipeline.');
    return;
  }
  await walk(INPUT_IMAGES, async (file) => {
    const ext = path.extname(file).toLowerCase();
    if (!shouldProcess(ext, RASTER_INPUT_EXTS)) return;
    await convertRasterFile(file, INPUT_IMAGES, OUTPUT_OPTIMG);
  });
}

async function processInputVectors() {
  logSection('Processing vectors (/inputvectors → /public/outvect)');
  const exists = await fse.pathExists(INPUT_VECTORS);
  if (!exists) {
    console.warn('inputvectors directory not found; skipping vector pipeline.');
    return;
  }
  await walk(INPUT_VECTORS, async (file) => {
    const ext = path.extname(file).toLowerCase();
    if (!shouldProcess(ext, VECTOR_INPUT_EXTS)) return;
    // Copy original vector
    await copyVectorOriginal(file, INPUT_VECTORS, OUTPUT_OUTVECT);
    // Raster fallbacks
    await rasterizeVectorFallbacks(file, INPUT_VECTORS, OUTPUT_OUTVECT);
  });
}

async function main() {
  const start = Date.now();
  logSection(`Build start (${new Date().toLocaleString()}) on ${os.platform()} node ${process.version}`);

  await ensureSubmodules();
  await buildSubmodules();

  await processInputImages();
  await processInputVectors();

  logSection(`Done in ${(Date.now() - start) / 1000}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
