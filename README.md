# AI Development Command Center

A GitHub-first software-development command center designed around a strict **€0 budget**.

## Phase 1 status

The branch `feat/phase-1-dashboard-foundation` contains the first React + TypeScript + Vite dashboard scaffold, a local task composer, task helper tests, and GitHub Actions workflows for CI and GitHub Pages deployment.

**Important:** this is a UI foundation, not yet an autonomous AI developer. The dashboard's initial tasks are illustrative, and newly created tasks exist only in browser memory. No AI provider, persistent queue, backend, or code execution runner is connected.

## Local development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
npm test
npm run build
```

## GitHub deployment

The Pages workflow is configured to build and deploy from `main`. After the reviewed changes are merged, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source if it is not already selected.

For this repository, the expected project-site URL is:

`https://openplayer-team.github.io/AI-Development-Command-Center/`

The URL will work only after Pages is enabled and the deployment workflow succeeds.

## Cost and safety

- No paid provider is configured or called.
- GitHub Actions and Pages have account/usage limits; free availability is not unlimited.
- No API keys belong in frontend code.
- No automatic pull-request merge is enabled.
- Local-model fallback requires an explicitly configured, reachable machine or self-hosted runner.

See [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md) for constraints and next steps.
