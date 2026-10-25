import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = resolve(fileURLToPath(new URL('.', import.meta.url)), 'run-local-ollama.mjs');
const root = mkdtempSync(join(tmpdir(), 'local-ollama-provider-test-'));
const bin = join(root, 'bin');
const state = join(root, 'mock-started.txt');
const fakeOllama = join(bin, 'ollama');
mkdirSync(bin);
writeFileSync(fakeOllama, [
  '#!/bin/sh',
  'cat >/dev/null',
  'printf "started\\n" >> "$MOCK_OLLAMA_STATE"',
  'case "$MOCK_OLLAMA_MODE" in',
  '  success) printf "a local test answer\\n" ;;',
  '  fail) exit 7 ;;',
  '  large) head -c 2100000 /dev/zero ;;',
  '  hang) exec sleep 8 ;;',
  '  *) exit 9 ;;',
  'esac',
  '',
].join('\n'));
chmodSync(fakeOllama, 0o755);

function run(args, mode = 'success', extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 6000,
    env: {
      ...process.env,
      PATH: bin + delimiter + process.env.PATH,
      MOCK_OLLAMA_MODE: mode,
      MOCK_OLLAMA_STATE: state,
      ...extraEnv,
    },
  });
}

try {
  const prompt = join(root, 'prompt.txt');
  const output = join(root, 'answer.md');
  writeFileSync(prompt, 'This is test prompt content.\n');

  const success = run([
    '--provider', 'ollama-local',
    '--model', 'qwen3.5:9b',
    '--prompt', prompt,
    '--output', output,
    '--timeout-seconds', '5',
  ]);
  assert.equal(success.status, 0, success.stderr || success.stdout);
  assert.equal(readFileSync(output, 'utf8'), 'a local test answer\n');

  const cloudOutput = join(root, 'cloud.md');
  const beforeCloud = existsSync(state) ? readFileSync(state, 'utf8') : '';
  const cloud = run([
    '--provider', 'openai',
    '--model', 'qwen3.5:9b',
    '--prompt', prompt,
    '--output', cloudOutput,
  ]);
  assert.notEqual(cloud.status, 0);
  assert.match(cloud.stderr, /Only the local Ollama provider is allowed/);
  assert.equal(existsSync(cloudOutput), false);
  assert.equal(readFileSync(state, 'utf8'), beforeCloud, 'cloud selection must not spawn a provider');

  const injection = run([
    '--provider', 'ollama-local',
    '--model', 'model;touch-pwned',
    '--prompt', prompt,
    '--output', join(root, 'invalid.md'),
  ]);
  assert.notEqual(injection.status, 0);
  assert.match(injection.stderr, /unsupported characters/);

  const failureOutput = join(root, 'failed.md');
  const failure = run([
    '--provider', 'ollama-local',
    '--model', 'qwen3.5:9b',
    '--prompt', prompt,
    '--output', failureOutput,
  ], 'fail');
  assert.notEqual(failure.status, 0);
  assert.match(failure.stderr, /failed with exit code 7/);
  assert.equal(existsSync(failureOutput), false, 'failed inference must not create an output file');

  const timeout = run([
    '--provider', 'ollama-local',
    '--model', 'qwen3.5:9b',
    '--prompt', prompt,
    '--output', join(root, 'timeout.md'),
    '--timeout-seconds', '1',
  ], 'hang');
  assert.notEqual(timeout.status, 0);
  assert.match(timeout.stderr, /exceeded the configured timeout/);

  const oversizePrompt = join(root, 'oversize-prompt.txt');
  writeFileSync(oversizePrompt, Buffer.alloc(100001, 0x41));
  const oversized = run([
    '--provider', 'ollama-local',
    '--model', 'qwen3.5:9b',
    '--prompt', oversizePrompt,
    '--output', join(root, 'oversized.md'),
  ]);
  assert.notEqual(oversized.status, 0);
  assert.match(oversized.stderr, /exceeds the 100000-byte safety limit/);

  const outputLimit = run([
    '--provider', 'ollama-local',
    '--model', 'qwen3.5:9b',
    '--prompt', prompt,
    '--output', join(root, 'large.md'),
  ], 'large');
  assert.notEqual(outputLimit.status, 0);
  assert.match(outputLimit.stderr, /output exceeded the safety limit/);
  assert.equal(existsSync(join(root, 'large.md')), false);

  console.log('All local Ollama provider tests passed.');
} finally {
  rmSync(root, { recursive: true, force: true });
}
