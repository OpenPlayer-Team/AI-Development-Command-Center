# Local Ollama planning runner

## What this phase does

The `Local AI task planner` workflow retrieves an open GitHub Issue labelled `agent-task`, sends its bounded title/body to an already-installed local Ollama model, and uploads a Markdown implementation plan for human review.

It deliberately does **not**:
- check out repository source code;
- run commands from the task description;
- edit source files or create a branch;
- create a pull request or merge changes;
- access API keys or other application secrets.

The model output is untrusted. A generated plan is not proof that files exist or tests pass.

## Prerequisites

1. A Linux machine or disposable VM dedicated to this workload.
2. GitHub Actions self-hosted runner installed and registered for this repository.
3. Runner labels include `self-hosted`, `linux`, and `ai-agent`.
4. Ollama installed and running on that machine.
5. The chosen model already pulled locally using Ollama.
6. In repository **Settings → Secrets and variables → Actions → Variables**, create `OLLAMA_MODEL` with the exact installed model name (for example, the model name shown by `ollama list`).

Do not use a runner that has personal files, SSH keys, cloud credentials, Docker socket access, production access, or reusable secrets. Prefer a disposable VM with limited network access. Do not register a personal workstation as an always-on runner for untrusted tasks.

## Run

1. Ensure the reviewed feature branch containing this workflow has been merged to the default branch. GitHub's manual workflow dispatch may not expose workflow files that exist only on a feature branch.
2. Create a task through **Actions → Create durable task**, or create an Issue with the `agent-task` label.
3. Open **Actions → Local AI task planner → Run workflow**.
4. Enter the open task Issue number and start the workflow.
5. Inspect the run summary and download the `local-agent-plan-N` artifact.

## Limits and next phase

This is a planning-only milestone, not yet an autonomous coding agent. It is intentionally manual and bounded to 10 minutes. Before enabling code changes, design a separate disposable workspace, enforce command allowlists, apply network and filesystem restrictions, avoid exposing secrets to model-generated code, run tests in isolation, and require explicit human approval before opening a pull request. Never auto-merge.

GitHub-hosted runner minutes and self-hosted infrastructure have different cost profiles. Ollama model inference itself can be local and incur no model API charge, but hardware/electricity and GitHub usage limits still apply. No paid provider fallback is configured.
