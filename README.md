# AI Development Command Center

A GitHub-first software-development command center designed around a strict **€0 budget**.

## Current status

The React + TypeScript + Vite dashboard is an interface preview. It can create tasks in the current browser session, but those entries are not durable and do not execute code. The repository also includes GitHub Actions CI and a Pages deployment workflow.

### Phase 2: durable GitHub task intake

A manual, GitHub-native intake path is implemented in `.github/workflows/task-intake.yml`. It creates a real GitHub Issue for each submitted task, with priority labels and a record of the submitter/source commit. It does **not** run an AI agent, execute repository code, or merge pull requests.

To create a durable task (after this reviewed feature branch has been merged into the default branch, because GitHub only enables `workflow_dispatch` for workflows present on the default branch):

1. Open the repository's **Actions** tab.
2. Select **Create durable task**.
3. Click **Run workflow** and enter a short title, detailed goal/acceptance criteria, and priority.
4. Run it, then open the issue URL in the workflow summary.

The workflow uses the built-in `GITHUB_TOKEN` with `issues: write`; no personal access token or paid service is required. Task text is untrusted input and is stored as issue content only.

### Phase 3: local AI planning (planning only)

The `.github/workflows/local-agent-plan.yml` workflow can send an issue to a pre-installed local Ollama model and upload a Markdown plan. It does **not** check out source code, execute model-generated commands, edit files, create a branch, open a PR, or merge anything.

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

See [local runner setup](docs/LOCAL-AGENT-RUNNER.md) for details. The separate **Agent runner preflight** only validates an issue and does not invoke a model.

### Phase 4: local AI patch proposal (not applied)

The `.github/workflows/local-agent-patch-proposal.yml` workflow can ask the local Ollama model to propose a unified diff using a bounded source snapshot. It checks that the diff applies cleanly and uploads it for review. A separate ephemeral GitHub-hosted runner applies the proposal only in its temporary workspace and runs project tests/build when a patch exists. **It does not commit, push, open a PR, or merge.**

It requires the same dedicated isolated Linux runner, local Ollama model, and `OLLAMA_MODEL` repository variable described above. The local Ollama generation step has not been end-to-end verified on a configured self-hosted runner. The hosted test job is isolated from that runner and its credentials. Passing tests do not prove correctness or security. `git apply --check` validates applicability only. Review the artifact and run tests separately before using any part of it.

See [local patch proposal setup and safety limits](docs/LOCAL-AGENT-PATCH-PROPOSAL.md).

## Local development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
npm test
npm run build
npm audit
```

The CI workflow runs tests, a production build, and a diagnostic dependency audit. Resolve audit findings based on the actual report; do not blindly use `npm audit fix --force`.

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
- Autonomous code editing is not enabled yet; it requires a separate isolated execution design and explicit human review.

See [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md) for constraints and next steps.
