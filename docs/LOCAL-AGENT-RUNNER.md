# Local Ollama agent runner

This guide covers the local-model steps in the command-center workflow. The runner is optional infrastructure: the workflows cannot call Ollama until a suitable runner is registered and the model variable exists.

## Workflow stages

1. **Durable intake:** the task-intake workflow creates a GitHub Issue labelled `agent-task` and `priority:...`.
2. **Preflight / planning:** the manual planner validates an issue and can upload a plan artifact. Planning alone does not edit code.
3. **Patch proposal:** the manual `Local AI patch proposal` workflow sends bounded task/source context to local Ollama and produces a unified diff artifact.
4. **Isolated verification:** a fresh GitHub-hosted Linux runner applies the proposed diff only in its temporary workspace after the patch allowlist validator passes, then runs `npm test` and `npm run build`. Dependency installation uses `npm ci --ignore-scripts`.
5. **PR publication:** after the successful `workflow_dispatch` run on the default branch, a separate publisher checks the artifact again and may create a restricted-scope branch and pull request. It never merges or auto-approves.

The local model does not receive a GitHub write token. Its output is untrusted and is never applied to the self-hosted runner's checkout. The test runner and publisher use separate ephemeral GitHub-hosted jobs.

## Prerequisites

1. A disposable Linux VM or dedicated host that can safely run a self-hosted GitHub Actions runner.
2. The repository self-hosted runner registered with labels `self-hosted`, `linux`, and `ai-agent`.
3. Ollama installed and running on the runner. Verify it with `ollama list`.
4. The desired model pulled locally with Ollama. Verify its exact model name using `ollama list`.
5. Repository Actions variable `OLLAMA_MODEL` set to that exact model name under **Settings → Secrets and variables → Actions → Variables**.
6. Node.js and GitHub CLI (`gh`) installed on the self-hosted runner. The planner/proposal workflows use `gh issue view` with the job's read-only token.

Do not register a personal daily-use workstation or a host with SSH keys, personal files, production credentials, cloud credentials, privileged Docker access, or unrelated network reachability. Prefer a disposable VM with limited outbound network access and no reusable secrets. Local inference may avoid model API charges, but the runner hardware and electricity are not free.

## Enable and run

These manual workflows must first be present on the default branch. A workflow existing only on the feature branch may not be available for manual dispatch.

1. Review and merge the feature PR only after inspecting its diffs and CI results.
2. Register and validate the isolated self-hosted runner.
3. Install Ollama and download the selected model, then set `OLLAMA_MODEL`.
4. In **Settings → Actions → General**, enable GitHub Actions to create pull requests if the publisher is expected to open PRs.
5. Create an issue with clear acceptance criteria and the `agent-task` label. The task-intake workflow creates this label when necessary.
6. Open **Actions → Local AI patch proposal → Run workflow**, select the default branch, enter the open issue number, and start the run.
7. Inspect the plan/proposal artifact, the hosted validation job, and any resulting pull request. Review the entire diff and its CI results before merging manually.

## Security boundaries

- The self-hosted jobs use read-only contents/issues permissions; checkout does not persist the GitHub token.
- Source context sent to Ollama is capped and intentionally incomplete. The model output and issue text remain untrusted.
- Artifacts exclude the prompt and source-context bundle; they contain a patch and review notes only.
- The reusable validator limits size, file count, changed lines, extensions and paths. It rejects tests, workflows, package/dependency files, lockfiles, symlinks, renames, binary patches, traversal and paths outside the allowlist.
- The hosted test job runs code from the generated patch without write permissions and without checkout credentials. Treat test execution as code execution, even though the runner is ephemeral.
- The publisher runs only after a successful manual proposal run on the default branch and opens a separate PR. It never merges or approves a PR.
- Passing tests and a successful build demonstrate only that those checks passed for that revision; they do not prove that the code is correct or safe.
- Review artifact contents, workflow changes, permissions, and PR CI before accepting a change.

## Known limitations

The proposal, test, and publisher workflow chain has not yet been verified end-to-end with a configured Ollama runner. The hosted CI jobs can be tested independently, but that is not proof that a model has proposed a real patch. GitHub's anonymous API has rate limits; the dashboard only reads public repository data and does not authenticate to private repositories. No paid model provider or automatic merge is configured.
