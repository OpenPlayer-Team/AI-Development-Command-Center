# Local AI patch proposal

This workflow is an optional, proposal-only step between local planning and any future autonomous execution.

## Prerequisites

- The workflow must be on the repository's default branch before GitHub enables manual dispatch.
- A dedicated disposable Linux self-hosted runner registered with labels `self-hosted`, `linux`, and `ai-agent`.
- Git, Node.js, GitHub CLI (`gh`), and Ollama installed on that runner.
- The requested model already downloaded in Ollama.
- Repository Actions variable `OLLAMA_MODEL` set to the exact model name.

Do not register a personal daily-use workstation as this runner. Use a disposable VM or isolated machine with no personal files, SSH keys, production credentials, or unrelated network access. Self-hosted runners execute workflow steps on your infrastructure and must be treated as a security boundary.

## Run

1. Create an open GitHub Issue with the `agent-task` label and clear acceptance criteria.
2. Open **Actions → Local AI patch proposal → Run workflow**.
3. Enter the issue number and start the run.
4. Download the `local-agent-patch-proposal-N` artifact.
5. Inspect the entire diff and rationale before using it.

## Safety boundaries

- The workflow has read-only repository and issue permissions.
- Checkout does not persist the GitHub token in Git configuration.
- It passes a bounded selection of tracked text files to the local model; context is incomplete by design.
- It excludes hidden files, `.env` files, lockfiles, likely secret/credential filenames, and workflow files.
- `git apply --check` on the local runner checks only whether the proposed diff applies cleanly. It does not prove correctness or safety.
- A separate ephemeral GitHub-hosted runner downloads the artifact, checks out the matching source, applies the proposal only in its temporary workspace, installs dependencies with lifecycle scripts disabled, then runs `npm test` and `npm run build` when a patch exists.
- The hosted validation job has read-only repository permission, does not persist checkout credentials, and does not commit, push, create a branch, open a PR, or merge.
- The test/build job executes proposed project code. Its isolation depends on GitHub-hosted runner disposal and must never be replaced with a persistent self-hosted runner.
- The artifact may contain source snippets and task text. Treat it as repository data and retain it only as long as needed.
- Never regard a model-generated patch as trusted. Human review and separate tests are required.

## Known limitations

The workflow is not end-to-end verified until it is run on the isolated runner with the chosen local model. Large tasks, binary assets, omitted files, and cross-file dependencies may make a proposal incomplete or unusable. A rejected or invalid patch should be treated as a failed attempt, not repaired by disabling validation.
