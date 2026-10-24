import assert from 'node:assert/strict';
import { redactSecrets } from './redact-agent-context.mjs';

const sample = [
  'GITHUB_TOKEN=ghp_TEST_TOKEN_01234567890123456789',
  'const API_KEY = "example-api-secret-123456789";',
  'const awsKey = "AKIA1234567890ABCDEF";',
  'Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789',
  'const privateUrl = "https://alice:super-secret-password-123@example.invalid/path";',
  'const jwt = "eyJabcdefghijk.eyJabcdefghijk.eyJabcdefghijk";',
  '-----BEGIN RSA PRIVATE KEY-----',
  'FAKE_PRIVATE_KEY_MATERIAL',
  '-----END RSA PRIVATE KEY-----',
  'const harmlessValue = "ordinary-value";',
].join('\n');

const redacted = redactSecrets(sample);
for (const secret of [
  'ghp_TEST_TOKEN_01234567890123456789',
  'example-api-secret-123456789',
  'AKIA1234567890ABCDEF',
  'abcdefghijklmnopqrstuvwxyz0123456789',
  'super-secret-password-123',
  'eyJabcdefghijk.eyJabcdefghijk.eyJabcdefghijk',
  'FAKE_PRIVATE_KEY_MATERIAL',
]) {
  assert.equal(redacted.includes(secret), false, 'secret leaked into redacted output: ' + secret);
}

assert.match(redacted, /\[REDACTED_GITHUB_TOKEN\]|\[REDACTED\]/);
assert.match(redacted, /\[REDACTED_PRIVATE_KEY_BLOCK\]/);
assert.match(redacted, /ordinary-value/, 'ordinary non-secret source text should be retained');
console.log('All agent-context redaction tests passed.');
