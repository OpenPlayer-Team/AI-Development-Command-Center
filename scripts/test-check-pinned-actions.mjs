import assert from 'node:assert/strict';
import { findUnpinnedActions, validateWorkflows } from './check-pinned-actions.mjs';

const valid = [
  'name: test',
  'steps:',
  '  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7',
  '  - uses: ./.github/actions/local',
  '  - uses: ../shared/action',
].join('\n');
assert.deepEqual(findUnpinnedActions(valid), []);

for (const ref of ['actions/checkout@v4', 'actions/checkout@main', 'actions/checkout', 'actions/checkout@deadbeef']) {
  const failures = findUnpinnedActions('      uses: ' + ref, '.github/workflows/test.yml');
  assert.equal(failures.length, 1, 'expected unpinned ref to fail: ' + ref);
  assert.equal(failures[0].line, 1);
  assert.equal(failures[0].reference, ref);
}

const mixed = validateWorkflows([
  { file: 'one.yml', contents: 'uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1' },
  { file: 'two.yml', contents: 'uses: actions/setup-node@v4\nuses: ./local-action' },
]);
assert.deepEqual(mixed.map((failure) => [failure.file, failure.line, failure.reference]), [
  ['two.yml', 1, 'actions/setup-node@v4'],
]);

console.log('All pinned-action policy tests passed.');
