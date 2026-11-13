import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, copyFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const pipeline = await readFile(new URL('../.gitlab-ci.yml', import.meta.url), 'utf8');
const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

test('check runs before deploy and deploy consumes its artifacts', () => {
  assert.match(pipeline, /stages:\s*\n\s*- check\s*\n\s*- deploy/);
  assert.match(pipeline, /check:\s*\n\s*stage: check[\s\S]*?pnpm check/);
  assert.match(pipeline, /deploy_to_vm:[\s\S]*?needs:\s*\n\s*- job: check\s*\n\s*artifacts: true/);
  assert.match(pipeline, /expire_in: 7 days/);
});

test('toolchain versions and public commands are pinned', () => {
  assert.equal(packageJson.packageManager, 'pnpm@11.25.0');
  assert.equal(packageJson.devDependencies.playwright, '1.62.1');
  assert.match(packageJson.scripts.check, /run-checks/);
  assert.match(packageJson.scripts['test:browser'], /--browser/);
});

test('a failed build stops check before Node and browser tests, and leaves a log', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'mcv-check-failure-'));
  try {
    await mkdir(join(fixture,'scripts'));
    await mkdir(join(fixture,'tests'));
    await copyFile(new URL('../scripts/run-checks.mjs', import.meta.url), join(fixture,'scripts/run-checks.mjs'));
    await writeFile(join(fixture,'scripts/build.mjs'), 'console.log("intentional build failure");process.exit(42);');
    await writeFile(join(fixture,'tests/unreachable.mjs'), 'throw new Error("This step must not run");');
    await assert.rejects(promisify(execFile)(process.execPath,[join(fixture,'scripts/run-checks.mjs')],{timeout:10000}), error => {
      assert.equal(error.code,1);
      assert.match(error.stderr,/build failed with exit code 42/);
      return true;
    });
    assert.match(await readFile(join(fixture,'artifacts/logs/build.log'),'utf8'),/intentional build failure/);
    await assert.rejects(access(join(fixture,'artifacts/logs/node-tests.log')));
    await assert.rejects(access(join(fixture,'artifacts/logs/browser-dev2.log')));
  } finally {
    assert.ok(fixture.startsWith(join(tmpdir(),'mcv-check-failure-')));
    await rm(fixture,{recursive:true,force:true});
  }
});
