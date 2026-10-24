# AI Development Command Center

A GitHub-first software-development command center designed around a strict **€0 budget**.

## Current status

The React + TypeScript + Vite dashboard is an interface preview. It can create tasks in the current browser session, but those entries are not durable and do not execute code. The repository also includes GitHub Actions CI and a Pages deployment workflow.

### Phase 2: durable GitHub task intake

A manual, GitHub-native intake path is implemented in `.github/workflows/task-intake.yml`. It creates a real GitHub Issue for each submitted task, with priority labels and a record of the submitter/source commit. It does **not** run an AI agent, execute repository code, or merge pull requests.

To create a durable task:

1. Open the repository's **Actions** tab.
2. Select **Create durable task**.
3. Click **Run workflow** on the feature branch.
4. Enter a short title, detailed goal/acceptance criteria, and priority.
5. Run it, then open the issue URL in the workflow summary.

If the workflow is not listed or cannot create an issue, check repository Actions permissions and the workflow run log. The workflow uses the built-in `GITHUB_TOKEN` with `issues: write`; no personal access token or paid service is required.

**Security boundary:** task text is untrusted input. It is stored as issue content only. This workflow does not interpret it as shell commands.

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
- GitHub Actions and Pages have account/usage limits; free availability is not unlimited.
- No API keys belong in frontend code.
- No automatic pull-request merge is enabled.
- Local-model fallback requires an explicitly configured, reachable machine or self-hosted runner.
- A GitHub Issue is a durable queue record, not proof that an agent has run the task.

See [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md) for constraints and next steps.
