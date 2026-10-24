# Architecture and implementation status

## Current implementation

The first implementation branch contains a React + TypeScript + Vite static dashboard. Task creation and search work only in the current browser session. Initial task rows are illustrative demo data and must not be interpreted as real work performed by AI agents.

## Target architecture

- **GitHub repository:** source of truth for code, workflow definitions, issues, and pull requests.
- **GitHub Pages:** static frontend hosting only; it cannot host a persistent backend or run an AI model.
- **GitHub Actions:** finite, temporary runners for CI and bounded automation. Free quotas and usage limits apply.
- **Task queue:** use GitHub Issues or another explicitly configured GitHub-native store for durable tasks; do not rely on browser memory for persistence.
- **Local model fallback:** only possible when a user-configured machine or self-hosted runner is online and securely reachable.
- **AI provider:** not configured in this phase. Never assume free cloud model access is unlimited or silently switch to a paid provider.

## Dependency security verification

The CI dependency audit reported 6 findings before the Vite/Vitest upgrade (3 moderate, 1 high, 2 critical). On the upgraded branch, `npm audit` reported **0 vulnerabilities**; all 3 existing unit tests and the production build passed in GitHub Actions. Re-run the audit after future dependency changes.

## Safety requirements

1. No secrets in client-side code or committed files.
2. Use least-privilege GitHub permissions.
3. Bound execution time, retries, and allowed operations.
4. Treat repository content and task instructions as untrusted input.
5. Do not execute arbitrary untrusted pull-request code with secrets.
6. Changes must be proposed for human review; no automatic merge.
7. Report test results only when a workflow or developer has actually run them.

## Current limitations

- No backend, AI agent, cloud provider, local model, persistent queue, or code execution runner is connected.
- The dashboard includes a direct link to the manual GitHub Actions task-intake workflow. The local composer remains demo-only; durable tasks are created through the workflow and stored as GitHub Issues. There is no secure in-dashboard GitHub API session yet.
- GitHub Pages deployment requires a separate workflow and Pages configuration.
- The current CI workflow uses npm install without a committed package lockfile, so dependency resolution is not yet fully reproducible. A lockfile should be committed before release.
