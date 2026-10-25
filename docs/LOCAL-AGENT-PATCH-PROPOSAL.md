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
5. Inspect the entire diff and rationale before using it. After the automated hosted checks pass, the publisher may open a PR for the restricted paths; review the complete PR and its CI checks before merging.

## Safety boundaries

- The workflow has read-only repository and issue permissions.
- Checkout does not persist the GitHub token in Git configuration.
- It passes a bounded selection of tracked text files to the local model; context is incomplete by design.
- It excludes hidden files, `.env` files, lockfiles, likely secret/credential filenames, and workflow files.
- `git apply --check` on the local runner checks only whether the proposed diff applies cleanly. It does not prove correctness or safety.
- A separate ephemeral GitHub-hosted runner downloads the artifact, checks out the matching source, applies the proposal only in its temporary workspace, runs `npm ci --ignore-scripts`, then `npm test` and `npm run build` when a patch exists.
- The hosted validation job has read-only repository permission, does not persist checkout credentials, and does not publish repository changes.
- After a successful proposal run on the default branch, the separate publisher workflow can open a PR. It validates changed paths and size limits, rejects workflow/dependency/test edits and path traversal, and never merges.
- The test/build job executes proposed project code. Its isolation depends on GitHub-hosted runner disposal and must never be replaced with a persistent self-hosted runner.
- The artifact may contain source snippets and task text. Treat it as repository data and retain it only as long as needed.
- Never regard a model-generated patch as trusted. Human review and separate tests are required.

## Known limitations

The local generation and downstream PR publication are not end-to-end verified until they are run on the isolated runner with the chosen local model. Large tasks, binary assets, omitted files, and cross-file dependencies may make a proposal incomplete or unusable. A rejected or invalid patch should be treated as a failed attempt, not repaired by disabling validation.

## Pull-request publisher

The separate `.github/workflows/publish-validated-agent-patch.yml` listens for a successful proposal workflow run on the default branch. It downloads that run's artifact, applies the patch only in a fresh GitHub-hosted workspace, and permits only `src/`, `docs/`, or `README.md` paths. It rejects test files, workflow and dependency files, binary patches, symlinks/renames, path traversal, patches over 200 KB, changes over 12 files, and diffs over 1,000 changed lines.

If validation succeeds, it pushes a unique `ai/issue-N-run-ID` branch and opens a pull request. It never merges or auto-approves. The repository setting **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests** may need to be enabled for the built-in token to open a PR.

The publisher uses an elevated write token, so keep its code on the protected/default branch and review any workflow changes with extra care. The patch content remains untrusted; the allowlist is a risk-reduction boundary, not a proof of safety.
