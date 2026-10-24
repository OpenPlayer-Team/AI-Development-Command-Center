# Architecture and implementation status

## Current implementation

The current branch contains a React + TypeScript + Vite static dashboard. Task creation and search use browser-only demo state; initial task rows are illustrative and are not proof of AI work. A read-only client now fetches public repository metadata, open pull requests, open issues labelled `agent-task`, and recent Actions runs from the unauthenticated GitHub REST API. It uses GET requests only, stores no access token, and cannot read private-repository data.

## Target architecture

- **GitHub repository:** source of truth for code, workflow definitions, issues, and pull requests.
- **GitHub Pages:** static frontend hosting only; it cannot host a persistent backend or run an AI model.
- **GitHub Actions:** finite, temporary runners for CI and bounded automation. Free quotas and usage limits apply.
- **Task queue:** GitHub Issues provide durable task records; browser memory is not persistent.
- **Local model:** the opt-in planning workflow uses Ollama installed on a dedicated self-hosted Linux runner. It does not check out source code or execute task instructions.
- **Provider policy:** no paid provider is configured. Never assume free cloud model access is unlimited or silently switch to a paid provider.

## Dependency security verification

A prior CI dependency audit reported 6 findings before the Vite/Vitest upgrade (3 moderate, 1 high, 2 critical). On an upgraded branch revision, `npm audit` reported **0 vulnerabilities**; all 3 then-existing unit tests and the production build passed in GitHub Actions. Re-run CI and the audit after future dependency changes; this is not a claim about the latest commit until its CI run completes.

## Safety requirements

1. No secrets in client-side code or committed files.
2. Use least-privilege GitHub permissions.
3. Bound execution time, retries, and allowed operations.
4. Treat issue content, repository content, and model output as untrusted.
5. Do not execute arbitrary untrusted pull-request code with secrets.
6. Changes must be proposed for human review; no automatic merge.
7. Report test results only when a workflow or developer has actually run them.
8. The local planner must run only on a dedicated, isolated runner without personal or production credentials.

## Current limitations

- The dashboard's local composer is demo-only; durable tasks are created through the manual task-intake workflow and stored as GitHub Issues. The dashboard can display public issues labelled `agent-task`, open PRs, and recent workflow runs. The live reader is anonymous and read-only; a private repository or API rate limit results in an explicit error rather than requesting a token.
- The local Ollama workflow generates a planning artifact only. It does not edit code, execute tests, create a branch, or open a PR.
- The local planning workflow requires a configured self-hosted runner labelled `ai-agent`, Ollama, and the repository variable `OLLAMA_MODEL`. It has not been end-to-end verified until a real run is inspected.
- GitHub Actions workflow dispatch generally requires the workflow to be present on the default branch. Keep the feature PR open until the user explicitly approves merging.
- GitHub Pages deployment requires the appropriate repository Pages configuration.
- The current CI workflow uses npm install without a committed package lockfile, so dependency resolution is not yet fully reproducible. A lockfile should be committed before release.
