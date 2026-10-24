# Initial threat model

**Status:** initial implementation-level review, not an independent security audit. Revisit this document before enabling the workflows on a long-lived runner or broadening the patch allowlist.

## Scope and security goals

The command center is intended to create a low-cost, GitHub-first workflow where local AI may propose a small source change, hosted CI checks that proposal in a disposable environment, and a human reviews the resulting pull request. The system must not merge automatically, disclose credentials to a model, or execute generated commands on a persistent privileged machine.

Security goals:
- Keep GitHub credentials out of model prompts and generated artifacts.
- Treat issue text, repository source, and model output as untrusted data.
- Limit generated diffs to a short, explicitly permitted path set and bounded size.
- Run candidate project tests/build on an ephemeral GitHub-hosted runner with read-only repository permissions.
- Preserve a human review and merge decision.

## Assets

| Asset | Why it matters |
| --- | --- |
| GitHub token used by Actions | Can read issues; the publishing workflow can create branches and pull requests. |
| Source code and repository history | Must not be overwritten or expanded beyond the approved patch scope. |
| Self-hosted runner and local Ollama installation | A persistent runner can expose host files, local services, or credentials if misconfigured. |
| Patch artifact | Untrusted model output that can contain incorrect or malicious source changes. |
| CI results and review state | Must not be represented as proof beyond the exact commit and checks executed. |
| User task descriptions and source context | May contain prompt injection, personal data, or accidentally committed secrets. |

## Trust boundaries and current controls

### 1. Browser dashboard

- Uses anonymous HTTPS GET requests to public GitHub REST endpoints.
- Does not store a GitHub token, dispatch workflows, create issues, change branches, or merge pull requests.
- Validates GitHub URLs before rendering them as links.
- The task composer and illustrative queue rows are session-only demo state, clearly labelled as such; they are not durable tasks and do not execute code.

### 2. Task intake and preflight

- The task-intake workflow creates a GitHub Issue with labels and bounded fields; issue text is stored as data only.
- Preflight and local-model workflows require an open issue carrying the `agent-task` label and enforce title/body length limits.
- An issue label is an eligibility marker, not authorization to trust the task text.

### 3. Self-hosted local Ollama runner

- Must be a dedicated, disposable Linux runner with labels `self-hosted`, `linux`, and `ai-agent`; do not use a personal workstation or a machine with production credentials.
- The workflow verifies that Ollama and the configured `OLLAMA_MODEL` are installed.
- Checkout disables persistent Git credential configuration. The GitHub token used to read the issue is scoped to that step and is not passed as an environment variable to the model-generation step.
- The model receives a bounded snapshot of selected tracked source, docs, and config text. The prompt and source-context file are not uploaded as artifacts.
- Model output is written to a patch file, not evaluated as shell commands. No generated project code is run on the self-hosted runner.
- This is not a sandbox for a compromised runner or Ollama binary. Use host-level isolation, least-privilege OS accounts, restricted network access, no unrelated secrets, and rebuildable runner images.

### 4. Hosted patch validation

- Runs on a separate `ubuntu-latest` job after the proposal job succeeds.
- Uses a source checkout with `persist-credentials: false` and `contents: read`.
- A reusable validator rejects binary patches, renames, symlinks/mode changes, hidden/traversal paths, disallowed file types, test files, dependency manifests, lockfiles, workflow files, more than 12 files, more than 1,000 changed lines, or patches above 200 KB.
- The candidate is applied only in this disposable workspace. Dependency installation disables lifecycle scripts, and configured tests/build are executed here—not on the self-hosted runner.
- Passing tests/build establishes only that those commands passed for that exact candidate; it does not establish that the patch is secure or correct.

### 5. Pull-request publisher

- The publisher accepts only a successful manually dispatched proposal run from this repository's default branch and requires the run to come from the expected workflow path.
- It rechecks the issue is open and labelled `agent-task`, validates the patch allowlist again, and applies it in a temporary hosted workspace.
- It has write permissions because it pushes a separate proposal branch and opens a pull request. This is a sensitive capability. Its job does not invoke the model or run project tests with those write permissions; test/build are performed in the preceding read-only job.
- It never merges. Human review of the complete diff and the PR's own CI checks remains mandatory.
- Repository settings must explicitly allow Actions to create pull requests. Keep branch protection/rulesets enabled where available.

## Threats and residual risk

| Threat | Current mitigation | Residual risk / next action |
| --- | --- | --- |
| Prompt injection in issue text or source files | Prompt treats task/source as untrusted; generated output must pass a strict path and size allowlist. | Model can still produce misleading or harmful in-scope code. Require human diff review and tests. |
| Secret accidentally committed in a source file | GitHub token is not passed to the model-generation step; only bounded source files are selected. | File-name filters do not reliably detect secrets embedded in otherwise eligible source. Add secret scanning/redaction before broad use. |
| Malicious generated diff | Reusable validator, disposable hosted candidate tests, no generated-code execution on self-hosted runner. | An allowed `src/*` change can still introduce unsafe application behavior. Review every line. |
| Compromised or persistent self-hosted runner | Dedicated disposable Linux runner is required and documented. | Workflow checks alone cannot isolate the host. Use ephemeral provisioning, restricted egress, no other credentials, and routine rebuilds. |
| Artifact substitution or wrong run | Publisher restricts triggering workflow, event, branch, repository, issue identity, and patch shape. | GitHub Actions/artifact supply-chain risk remains; pin third-party actions to reviewed full commit SHAs for stronger hardening. |
| Overprivileged publication token | Separate publisher workflow; scoped repository permissions; no merge permission is requested. | The publisher can write repository contents and open PRs while running. Review workflow changes and enforce repository rulesets. |
| False confidence from green CI | Workflow summaries document bounds and require human review; no automatic merge. | A green result is not a security verdict. Review diff, tests, dependencies, and workflow source. |
| Dependency supply-chain compromise | Install step uses `--ignore-scripts`; CI runs dependency audit diagnostically. | Dependency resolution is not fully reproducible until a lockfile is committed; review audit output and action versions. |

## Required operating procedure

Before enabling the full local proposal → publisher path:

1. Confirm the runner is isolated, disposable, and contains no unrelated credentials or production data.
2. Set `OLLAMA_MODEL` to the exact local model name and verify Ollama is available only as intended.
3. Ensure GitHub Actions is allowed to create pull requests and keep repository protection/rulesets in place.
4. Inspect the proposal artifact and validation run; do not treat generated text, applicability, or a green build as sufficient for approval.
5. Review every generated PR diff and its CI checks before merging manually.
6. Revisit this threat model whenever permissions, allowed paths, runner behavior, model provider, or publishing logic changes.

## Current non-goals

- No autonomous merge, deployment, release, or production command execution.
- No private-repository dashboard authentication.
- No paid cloud-model fallback or configured cloud AI provider.
- No claim that the self-hosted Ollama path has completed an end-to-end run; runner setup is still an external prerequisite.
