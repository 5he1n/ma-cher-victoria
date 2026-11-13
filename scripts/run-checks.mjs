import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const artifactsRoot = join(root, 'artifacts');
const logsRoot = join(artifactsRoot, 'logs');
const screenshotsRoot = join(artifactsRoot, 'screenshots');
const stepTimeoutMs = 3 * 60 * 1000;
const globalTimeoutMs = 14 * 60 * 1000;
const browserOnly = process.argv.slice(2).includes('--browser');
const nodeOnly = process.argv.slice(2).includes('--node');

async function findTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return findTests(path);
    return entry.isFile() && entry.name.endsWith('.mjs') ? [path] : [];
  }));
  return nested.flat().sort();
}

function runStep({ name, args, env = {} }, timeoutMs = stepTimeoutMs) {
  return new Promise((resolve, reject) => {
    const logPath = join(logsRoot, `${name}.log`);
    const log = createWriteStream(logPath);
    let completed = false;
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let timer;
    const finish = (error) => {
      if (completed) return;
      completed = true;
      if (timer) clearTimeout(timer);
      log.end(() => error ? reject(error) : resolve());
    };
    const write = chunk => {
      process.stdout.write(chunk);
      log.write(chunk);
    };
    child.stdout.on('data', write);
    child.stderr.on('data', write);
    child.on('error', error => finish(error));
    child.on('close', code => {
      finish(code === 0 ? undefined : new Error(`${name} failed with exit code ${code}; see ${relative(root, logPath)}`));
    });
    timer = setTimeout(() => {
      child.kill();
      finish(new Error(`${name} exceeded its timeout; see ${relative(root, logPath)}`));
    }, timeoutMs);
  });
}

async function main() {
  await Promise.all([mkdir(logsRoot, { recursive: true }), mkdir(screenshotsRoot, { recursive: true })]);
  const tests = await findTests(join(root, 'tests'));
  const browserChecks = ['dev2', 'dev3', 'dev4', 'dev6'].map(id => ({
    name: `browser-${id}`,
    args: [join('scripts', `verify-${id}.cjs`)],
    env: { SCREENSHOT_DIR: join(screenshotsRoot, id) },
  }));
  const nodeTests = { name: 'node-tests', args: ['--test', ...tests.map(path => relative(root, path))] };
  const steps = browserOnly
    ? browserChecks
    : nodeOnly
      ? [nodeTests]
      : [
        { name: 'build', args: [join('scripts', 'build.mjs')] },
        nodeTests,
        ...browserChecks,
      ];
  const deadline = Date.now() + globalTimeoutMs;
  for (const step of steps) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(`Checks exceeded their ${globalTimeoutMs / 60000}-minute global timeout`);
    }
    if (step.env?.SCREENSHOT_DIR) await mkdir(step.env.SCREENSHOT_DIR, { recursive: true });
    console.log(`\n==> ${step.name}`);
    await runStep(step, Math.min(stepTimeoutMs, remaining));
  }
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
