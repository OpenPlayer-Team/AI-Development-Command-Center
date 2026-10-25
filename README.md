# AI Development Command Center

A GitHub-first software-development command center designed around a strict **€0 budget**.

## Current status

The React + TypeScript + Vite dashboard is an interface preview. It can create tasks in the current browser session, but those entries are not durable and do not execute code. The repository also includes GitHub Actions CI and a Pages deployment workflow.

The sidebar opens dedicated views for task queue, agent workspace, GitHub activity, pull requests, workflow runs, terminal-log guidance, and settings. The queue/PR/workflow panels use public read-only GitHub metadata. Agent Workspace includes the last recorded Ollama health-check run and a link to rerun the diagnostic; it labels the result as historical, not proof of current provider availability. The sample task rows and quick composer on Overview remain session-only demo data.

### Phase 2: durable GitHub task intake

A manual, GitHub-native intake path is implemented in `.github/workflows/task-intake.yml`. It creates a real GitHub Issue for each submitted task, with priority labels and a record of the submitter/source commit. It does **not** run an AI agent, execute repository code, or merge pull requests.

To create a durable task (after this reviewed feature branch has been merged into the default branch, because GitHub only enables `workflow_dispatch` for workflows present on the default branch):

1. Open the repository's **Actions** tab.
2. Select **Create durable task**.
3. Click **Run workflow** and enter a short title, detailed goal/acceptance criteria, and priority.
4. Run it, then open the issue URL in the workflow summary.

The workflow uses the built-in `GITHUB_TOKEN` with `issues: write`; no personal access token or paid service is required. Task text is untrusted input and is stored as issue content only.

### Phase 3: local AI planning (planning only)

The `.github/workflows/local-agent-plan.yml` workflow checks out only the redaction and local-provider utilities, validates and redacts the issue title/body, sends the redacted task data to a pre-installed local Ollama model through `scripts/run-local-ollama.mjs`, redacts the generated plan, and uploads that Markdown plan. The adapter enforces the local-only provider, model-name validation, prompt/output limits, and a bounded timeout; it has no paid-cloud fallback. It does **not** inspect application source, execute model-generated commands, edit files, create a branch, open a PR, or merge anything.

Prerequisites:
- A dedicated, disposable Linux self-hosted runner registered with labels `self-hosted`, `linux`, and `ai-agent`.
- Ollama installed and running on that runner, with the desired model already downloaded.
- Repository variable `OLLAMA_MODEL` set to the exact installed model name (Settings → Secrets and variables → Actions → Variables).

Do not use a personal workstation or runner with personal/production credentials. The task and model output are untrusted. The runner must be isolated and have no unnecessary secrets or network access.

After this reviewed branch is merged into the default branch:

1. Open **Actions → Local AI task planner → Run workflow**.
2. Enter the number of an open issue with the `agent-task` label.
3. Inspect the run summary and download the `local-agent-plan-N` artifact.

The workflow requires the dedicated self-hosted runner; it will not run successfully until that infrastructure and model variable are configured. It has not been end-to-end verified yet. A plan is a draft, not evidence that the repository was inspected or tests passed.

See [local runner setup](docs/LOCAL-AGENT-RUNNER.md) for details, including the **Local Ollama runner health** diagnostic. The separate **Agent runner preflight** only validates an issue and does not invoke a model.

### Phase 4: local AI patch proposal (not applied)

The `.github/workflows/local-agent-patch-proposal.yml` workflow asks the local Ollama model through the same local-only adapter to propose a unified diff using a bounded source snapshot. It checks that the diff applies cleanly and uploads it for review. A separate ephemeral GitHub-hosted runner applies the same strict patch allowlist before testing it in a temporary workspace, then runs project tests/build when a patch exists. **It does not commit, push, open a PR, or merge.**

It requires the same dedicated isolated Linux runner, local Ollama model, and `OLLAMA_MODEL` repository variable described above. The local Ollama generation step has not been end-to-end verified on a configured self-hosted runner. The hosted test job is isolated from that runner and its credentials. Passing tests do not prove correctness or security. `git apply --check` validates applicability only. Review the artifact and run tests separately before using any part of it.

See [local patch proposal setup and safety limits](docs/LOCAL-AGENT-PATCH-PROPOSAL.md).

### Live GitHub status (anonymous, read-only)

The dashboard reads the repository's public metadata, open pull requests, open issues labelled `agent-task`, and the latest Actions runs directly from the GitHub REST API. It needs no token and performs only GET requests. Use the refresh control in the GitHub repository panel to request updated data. If the repository becomes private or anonymous API access is rate-limited, the panel shows an error instead of asking for credentials.

Task composer entries and the illustrative task rows are still demo-only. The dashboard does not create GitHub issues, trigger workflows, change branches, or write to GitHub from the browser. Use the durable task intake workflow to create actual GitHub Issues.

### Phase 5: publish a validated proposal as a pull request

The `.github/workflows/publish-validated-agent-patch.yml` workflow listens for a successful **Local AI patch proposal** run on the repository's default branch. A read-only job checks the source run, Issue status/label, secret-like output, patch boundary, and applicability, then uploads a short-lived validated patch artifact. A separate publisher job rechecks the Issue, fetches the public source anonymously, and revalidates/applies the patch without `GH_TOKEN`. The token is scoped to Issue lookup and branch/PR steps; no generated project code is executed in the write-permission job.

The publisher accepts changes only under `src/`, Markdown under `docs/`, or `README.md`; it rejects test files, workflow files, dependency manifests, lockfiles, binary/mode/symlink changes, hidden/traversal paths, secret-like output, and oversized diffs (more than 12 files or 1,000 changed lines). These boundaries have dedicated CI tests. It never merges. The generated PR and its CI results must still be reviewed manually.

Before enabling this after merge, go to **Settings → Actions → General** and allow GitHub Actions to create pull requests. The publisher has not been end-to-end tested with the local Ollama runner, so it is an implementation awaiting first operational verification—not a claim of autonomous completion. The artifact contains only the patch and review notes, not the model prompt or source-context bundle.

## Local development

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev
npm test
npm run build
npm audit
```

To run the JavaScript-based policy tests locally, use `node scripts/test-check-pinned-actions.mjs`, `node scripts/test-check-npm-audit.mjs`, `node scripts/test-run-local-ollama.mjs`, and `node scripts/test-redact-agent-context.mjs`. The patch-policy test is a Bash script (`bash scripts/test-validate-agent-patch.sh`) and requires Bash/Git. The mock provider tests do not invoke a real model or make network requests.

The CI workflow runs actionlint, a full-SHA pin-policy check, expanded patch-policy tests, npm-audit gate tests, local-only Ollama-adapter tests, best-effort secret-redaction tests, the app unit tests, and a production build. The current dashboard CI run passes 16 application unit tests; it does not run a real Ollama model. It runs `npm audit --audit-level=high` and fails closed on high/critical findings, inconsistent severity totals, or unusable audit output; lower-severity findings are still reported. Do not blindly use `npm audit fix --force`.

## GitHub deployment

The Pages workflow is configured to build and deploy from `main`. After the reviewed changes are merged, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source if it is not already selected.

Expected project-site URL, available only after Pages is enabled and a deployment succeeds:

`https://openplayer-team.github.io/AI-Development-Command-Center/`

## Cost and safety

- No paid provider is configured or called.
- Local Ollama inference can avoid model API charges, but runner hardware/electricity and GitHub usage limits still apply.
- No API keys belong in frontend code.
- No automatic pull-request merge is enabled.
- A GitHub Issue is a durable queue record, not proof that an agent has run the task.
- The optional patch workflow can propose a limited code change and open a PR after validation; it cannot merge, and a human must review it.

See [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), and the [initial threat model](docs/THREAT-MODEL.md) for constraints, residual risks, and next steps.
