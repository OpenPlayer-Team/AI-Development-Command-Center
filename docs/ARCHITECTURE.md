# Architecture and implementation status

## Current implementation

The current branch contains a React + TypeScript + Vite static dashboard. The Overview's quick composer and sample task rows use browser-only demo state; they are not proof of AI work. Sidebar navigation opens dedicated task queue, agent workspace, GitHub activity, pull-request review, workflow, terminal-log guidance, and settings views. The queue, PR, and workflow views use anonymous read-only GitHub metadata and link to the real records; sidebar counts use live open GitHub issue/PR counts when available. The client stores no access token and cannot read private-repository data.

## Target architecture

- **GitHub repository:** source of truth for code, workflow definitions, issues, and pull requests.
- **GitHub Pages:** static frontend hosting only; it cannot host a persistent backend or run an AI model.
- **GitHub Actions:** finite, temporary runners for CI and bounded automation. Free quotas and usage limits apply.
- **Task queue:** GitHub Issues provide durable task records; browser memory is not persistent.
- **Local model:** the opt-in planning workflow uses Ollama installed on a dedicated self-hosted Linux runner. It checks out only the redaction utility and sends no application source to the model; issue data and plan output receive best-effort redaction. It does not execute task instructions.
- **Provider policy:** no paid provider is configured. Never assume free cloud model access is unlimited or silently switch to a paid provider.

## Dependency security verification

On commit `c73370ba54fe86320013331cbce3d5a2c8a33d6b` (2026-10-25), [GitHub Actions CI run 40182551648](https://github.com/OpenPlayer-Team/AI-Development-Command-Center/actions/runs/40182551648) completed successfully: workflow lint, full-SHA action-pin enforcement and tests, patch-policy tests, npm-audit gate tests, secret-redaction tests, **14 unit tests**, and the production build passed; `npm audit --audit-level=high` reported **0 vulnerabilities**. The CI audit step fails on high/critical findings, inconsistent audit counts, or unusable audit output. Re-run CI after future dependency or implementation changes; this evidence applies to the cited commit.

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
- `local-agent-plan.yml` generates a planning artifact only; it does not edit code, execute tests, create a branch, or open a PR. The separate `local-agent-patch-proposal.yml` can propose a bounded diff and test/build it on an ephemeral hosted runner, after which `publish-validated-agent-patch.yml` may open a restricted-scope PR. The local Ollama runner and the proposal → validation → publication path have not been end-to-end verified.
- The local planning workflow requires a configured self-hosted runner labelled `ai-agent`, Ollama, and the repository variable `OLLAMA_MODEL`. It has not been end-to-end verified until a real run is inspected.
- GitHub Actions workflow dispatch generally requires the workflow to be present on the default branch. Keep the feature PR open until the user explicitly approves merging.
- GitHub Pages deployment requires the appropriate repository Pages configuration.
- `package-lock.json` is committed and CI, Pages, and hosted patch validation use `npm ci`; patch validation also disables lifecycle scripts with `--ignore-scripts`. This makes dependency installation reproducible for the committed lockfile, but does not eliminate upstream dependency or GitHub Action supply-chain risk.
