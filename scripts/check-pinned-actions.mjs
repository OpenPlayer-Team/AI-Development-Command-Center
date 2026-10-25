import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_DIR = resolve(SCRIPT_DIR, '../.github/workflows');
const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/i;

/**
 * Find external GitHub Actions references that aren't pinned to a full commit SHA.
 * Local reusable actions (./path) are allowed and are reviewed as repository code.
 */
export function findUnpinnedActions(contents, filePath = '<workflow>') {
  const findings = [];
  for (const [index, line] of String(contents).split(/\r?\n/).entries()) {
    const match = line.match(/^\s*uses:\s*([^\s#]+)/);
    if (!match) continue;

    const reference = match[1];
    if (reference.startsWith('./') || reference.startsWith('../')) continue;

    const at = reference.lastIndexOf('@');
    const pinnedSha = at >= 0 ? reference.slice(at + 1) : '';
    if (!FULL_COMMIT_SHA.test(pinnedSha)) {
      findings.push({
        file: filePath,
        line: index + 1,
        reference,
      });
    }
  }
  return findings;
}

export function validateWorkflows(workflows) {
  return workflows.flatMap(({ file, contents }) => findUnpinnedActions(contents, file));
}

function main() {
  const files = readdirSync(WORKFLOW_DIR)
    .filter((name) => /\.(?:yml|yaml)$/i.test(name))
    .sort();
  if (files.length === 0) {
    console.error('No workflow YAML files found; cannot verify action pins.');
    process.exit(2);
  }

  const findings = validateWorkflows(files.map((file) => ({
    file,
    contents: readFileSync(join(WORKFLOW_DIR, file), 'utf8'),
  })));

  if (findings.length > 0) {
    console.error('Unpinned third-party GitHub Actions detected. Use a reviewed full 40-character commit SHA:');
    for (const finding of findings) {
      console.error('- ' + finding.file + ':' + finding.line + ' ' + finding.reference);
    }
    process.exit(1);
  }
  console.log('All external GitHub Actions are pinned to full commit SHAs.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
