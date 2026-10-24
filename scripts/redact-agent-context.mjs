import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Best-effort secret redaction for untrusted issue/source context before it is
 * sent to a local model. It does not mutate source files and is not a substitute
 * for a dedicated secret scanner.
 */
export function redactSecrets(input) {
  let output = String(input);

  output = output.replace(
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/gi,
    '[REDACTED_PRIVATE_KEY_BLOCK]',
  );
  output = output.replace(
    /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/gi,
    '[REDACTED_GITHUB_TOKEN]',
  );
  output = output.replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_ACCESS_KEY]');
  output = output.replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_API_TOKEN]');
  output = output.replace(
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    '[REDACTED_JWT]',
  );
  output = output.replace(/\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}/gi, 'Bearer [REDACTED]');
  output = output.replace(/(https?:\/\/[^\s/:@]+:)[^\s/@]+(@)/gi, '$1[REDACTED]$2');
  output = output.replace(
    /(\b[A-Z0-9_-]*(?:API[_-]?KEY|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN|CLIENT[_-]?SECRET|AWS[_-]?SECRET[_-]?ACCESS[_-]?KEY|PASSWORD|PASSWD|PRIVATE[_-]?KEY|AUTH[_-]?TOKEN|BEARER[_-]?TOKEN|GH_TOKEN|GITHUB_TOKEN|SECRET)\b\s*[:=]\s*)(["']?)[^\s"',;]{8,}/gi,
    '$1$2[REDACTED]',
  );
  output = output.replace(/([?&](?:access_token|api_key|token|secret|password)=)[^&\s]+/gi, '$1[REDACTED]');

  return output;
}

const isEntrypoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    process.stderr.write('Usage: node scripts/redact-agent-context.mjs <file>|--stdin\n');
    process.exit(2);
  }
  const input = inputPath === '--stdin' ? readFileSync(0, 'utf8') : readFileSync(inputPath, 'utf8');
  process.stdout.write(redactSecrets(input));
}
