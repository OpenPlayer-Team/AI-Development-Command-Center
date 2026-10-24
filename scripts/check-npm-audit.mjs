import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const severities = ['info', 'low', 'moderate', 'high', 'critical', 'total'];

export function evaluateAuditReport(report, commandExitCode) {
  if (typeof report !== 'object' || report === null || Array.isArray(report)) {
    throw new Error('npm audit returned a non-object JSON report.');
  }

  const counts = report.metadata?.vulnerabilities;
  if (typeof counts !== 'object' || counts === null || Array.isArray(counts)) {
    throw new Error('npm audit report is missing dependency vulnerability metadata.');
  }

  for (const severity of severities) {
    const count = counts[severity];
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('npm audit report contains an invalid count for ' + severity + '.');
    }
  }

  const severityTotal = counts.info + counts.low + counts.moderate + counts.high + counts.critical;
  if (counts.total !== severityTotal) {
    throw new Error('npm audit report contains inconsistent severity totals.');
  }

  if (!Number.isInteger(commandExitCode) || commandExitCode < 0) {
    throw new Error('npm audit command exit code is invalid.');
  }

  if (report.vulnerabilities !== undefined &&
      (typeof report.vulnerabilities !== 'object' || report.vulnerabilities === null || Array.isArray(report.vulnerabilities))) {
    throw new Error('npm audit report contains an invalid vulnerabilities object.');
  }
  if (counts.total > 0 && report.vulnerabilities === undefined) {
    throw new Error('npm audit report contains counts but no vulnerability details.');
  }
  const findings = Object.entries(report.vulnerabilities ?? {});
  const highOrCritical = counts.high > 0 || counts.critical > 0;
  if (highOrCritical) {
    return {
      ok: false,
      exitCode: 1,
      reason: 'High or critical vulnerabilities are not allowed in CI.',
      counts,
      findings,
    };
  }

  if (commandExitCode !== 0) {
    return {
      ok: false,
      exitCode: 2,
      reason: 'npm audit failed without reporting high/critical findings; failing closed.',
      counts,
      findings,
    };
  }

  return {
    ok: true,
    exitCode: 0,
    reason: 'No high or critical vulnerabilities reported.',
    counts,
    findings,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [reportPath, exitCodeText] = process.argv.slice(2);
  if (!reportPath || exitCodeText === undefined || !/^\d+$/.test(exitCodeText)) {
    process.stderr.write('Usage: node scripts/check-npm-audit.mjs <report.json> <npm-audit-exit-code>\n');
    process.exit(2);
  }

  try {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    const result = evaluateAuditReport(report, Number(exitCodeText));
    console.log('npm audit severity totals:', JSON.stringify(result.counts));
    for (const [name, item] of result.findings) {
      console.log(JSON.stringify({
        package: name,
        severity: item.severity,
        direct: item.isDirect,
        range: item.range,
        fixAvailable: item.fixAvailable,
        via: Array.isArray(item.via)
          ? item.via.map((entry) => typeof entry === 'string'
              ? entry
              : ({ name: entry.name, title: entry.title, range: entry.range, url: entry.url }))
          : [],
      }));
    }
    if (!result.ok) {
      console.error('npm audit policy failed: ' + result.reason);
      process.exit(result.exitCode);
    }
    console.log('npm audit policy passed: ' + result.reason);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'npm audit report could not be processed.');
    process.exit(2);
  }
}
