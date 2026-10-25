import assert from 'node:assert/strict';
import { evaluateAuditReport } from './check-npm-audit.mjs';

function report(overrides = {}, vulnerabilities = {}) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0, ...overrides };
  return { metadata: { vulnerabilities: counts }, vulnerabilities };
}

const clean = evaluateAuditReport(report(), 0);
assert.equal(clean.ok, true);
assert.equal(clean.exitCode, 0);

const lowAndModerate = evaluateAuditReport(
  report({ low: 2, moderate: 1, total: 3 }, {
    exampleLow: { severity: 'low', isDirect: true, range: '<1.0.0', fixAvailable: true, via: [] },
  }),
  0,
);
assert.equal(lowAndModerate.ok, true, 'lower severity findings should be reported but not blocked by the high threshold');

for (const [severity, counts] of [
  ['high', { high: 1, total: 1 }],
  ['critical', { critical: 1, total: 1 }],
]) {
  const result = evaluateAuditReport(report(counts, { examplePackage: { severity, isDirect: true, via: [] } }), 1);
  assert.equal(result.ok, false);
  assert.equal(result.exitCode, 1);
  assert.match(result.reason, /High or critical/);
}

const commandFailure = evaluateAuditReport(report(), 1);
assert.equal(commandFailure.ok, false);
assert.equal(commandFailure.exitCode, 2);
assert.match(commandFailure.reason, /failing closed/);

assert.throws(() => evaluateAuditReport({}, 0), /missing dependency vulnerability metadata/);
assert.throws(() => evaluateAuditReport({ metadata: { vulnerabilities: { high: -1 } } }, 0), /invalid count/);
assert.throws(() => evaluateAuditReport(report(), Number.NaN), /exit code is invalid/);
assert.throws(() => evaluateAuditReport(report({ high: 1, total: 0 }), 0), /inconsistent severity totals/);
assert.throws(() => evaluateAuditReport({ ...report({ low: 1, total: 1 }), vulnerabilities: undefined }, 0), /no vulnerability details/);
assert.throws(() => evaluateAuditReport({ ...report(), vulnerabilities: [] }, 0), /invalid vulnerabilities object/);
assert.throws(() => evaluateAuditReport(null, 0), /non-object JSON report/);

console.log('All npm audit policy tests passed.');
