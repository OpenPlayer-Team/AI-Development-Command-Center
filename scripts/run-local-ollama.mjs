#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SUPPORTED_PROVIDER = 'ollama-local';
export const MAX_PROMPT_BYTES = 100_000;
export const MAX_OUTPUT_BYTES = 2_000_000;
export const DEFAULT_TIMEOUT_SECONDS = 480;
export const MAX_TIMEOUT_SECONDS = 720;

export function parseArguments(argv) {
  const parsed = {};
  const allowed = new Set(['--provider', '--model', '--prompt', '--output', '--timeout-seconds']);
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!allowed.has(key)) throw new Error('Unsupported argument: ' + key);
    if (parsed[key] !== undefined) throw new Error('Duplicate argument: ' + key);
    const value = argv[i + 1];
    if (typeof value !== 'string' || value.startsWith('--')) {
      throw new Error('Missing value for ' + key);
    }
    parsed[key] = value;
    i += 1;
  }

  const provider = parsed['--provider'] ?? SUPPORTED_PROVIDER;
  if (provider !== SUPPORTED_PROVIDER) {
    throw new Error('Only the local Ollama provider is allowed; cloud providers and paid fallback are disabled.');
  }

  const model = parsed['--model'] ?? process.env.OLLAMA_MODEL ?? '';
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(model)) {
    throw new Error('OLLAMA_MODEL is missing or contains unsupported characters.');
  }

  const promptPath = parsed['--prompt'] ? resolve(parsed['--prompt']) : '';
  const outputPath = parsed['--output'] ? resolve(parsed['--output']) : '';
  if (!promptPath || !outputPath) throw new Error('Both --prompt and --output are required.');
  if (promptPath === outputPath) throw new Error('Prompt and output paths must be different.');

  const timeoutSecondsText = parsed['--timeout-seconds'] ?? String(DEFAULT_TIMEOUT_SECONDS);
  if (!/^[1-9][0-9]*$/.test(timeoutSecondsText)) {
    throw new Error('Timeout must be a positive integer number of seconds.');
  }
  const timeoutSeconds = Number(timeoutSecondsText);
  if (!Number.isSafeInteger(timeoutSeconds) || timeoutSeconds > MAX_TIMEOUT_SECONDS) {
    throw new Error('Timeout must be between 1 and ' + MAX_TIMEOUT_SECONDS + ' seconds.');
  }

  return { provider, model, promptPath, outputPath, timeoutMs: timeoutSeconds * 1000 };
}

export function readPrompt(promptPath) {
  const file = statSync(promptPath);
  if (!file.isFile()) throw new Error('Prompt path must be a regular file.');
  if (file.size > MAX_PROMPT_BYTES) {
    throw new Error('Prompt exceeds the ' + MAX_PROMPT_BYTES + '-byte safety limit.');
  }
  return readFileSync(promptPath);
}

export function invokeOllama({ model, prompt, timeoutMs, spawnImpl = spawn }) {
  return new Promise((resolvePromise, rejectPromise) => {
    let child;
    try {
      child = spawnImpl('ollama', ['run', model], {
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch {
      rejectPromise(new Error('Could not start the local Ollama process.'));
      return;
    }

    const stdout = [];
    let outputBytes = 0;
    let outputTooLarge = false;
    let timedOut = false;
    let settled = false;
    const settleReject = (message) => {
      if (settled) return;
      settled = true;
      rejectPromise(new Error(message));
    };

    child.stdout.on('data', (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT_BYTES) {
        outputTooLarge = true;
        child.kill('SIGKILL');
        return;
      }
      stdout.push(Buffer.from(chunk));
    });
    // Don't print stderr: the local CLI might echo some prompt content.
    child.stderr.on('data', () => {});
    child.stdin.on('error', () => {});

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.on('error', () => {
      clearTimeout(timer);
      settleReject('Could not start the local Ollama process.');
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (settled) return;
      if (timedOut) {
        settleReject('Local Ollama inference exceeded the configured timeout.');
        return;
      }
      if (outputTooLarge) {
        settleReject('Local Ollama output exceeded the safety limit.');
        return;
      }
      if (code !== 0) {
        settleReject('Local Ollama process failed with exit code ' + String(code) + '.');
        return;
      }
      const output = Buffer.concat(stdout);
      if (output.length === 0 || output.toString('utf8').trim().length === 0) {
        settleReject('Local Ollama returned an empty result.');
        return;
      }
      settled = true;
      resolvePromise(output);
    });

    child.stdin.end(prompt);
  });
}

export async function runRequest(request, options = {}) {
  const prompt = readPrompt(request.promptPath);
  const outputDirectory = statSync(dirname(request.outputPath));
  if (!outputDirectory.isDirectory()) throw new Error('Output parent path must be a directory.');
  if (existsSync(request.outputPath)) {
    throw new Error('Output file already exists; refusing to overwrite prior model output.');
  }
  const output = await invokeOllama({
    model: request.model,
    prompt,
    timeoutMs: request.timeoutMs,
    spawnImpl: options.spawnImpl ?? spawn,
  });
  writeFileSync(request.outputPath, output, { flag: 'wx', mode: 0o600 });
  return { provider: request.provider, outputBytes: output.length };
}

async function main() {
  try {
    const request = parseArguments(process.argv.slice(2));
    const result = await runRequest(request);
    console.log('Local Ollama inference completed (' + result.outputBytes + ' output bytes).');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Local Ollama provider failed.';
    console.error('::error::' + message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
