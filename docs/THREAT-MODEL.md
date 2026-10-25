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
| Third-party GitHub Actions code | Runs with its step's permissions and can affect source, artifacts, or credentials. |
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
- The patch-proposal model receives a bounded snapshot of selected tracked source, docs, and config text. The planner checks out only the redaction utility; it sends no application source to the model. Both workflows redact common token/key/password assignments, bearer tokens, credential-bearing URLs, common API-token formats, JWT-like strings, and PEM private-key blocks before model input, and the planner redacts the generated plan before upload. Prompt and source-context files are not uploaded as artifacts.
- Model output is written to a patch file, not evaluated as shell commands. No generated project code is run on the self-hosted runner.
- This is not a sandbox for a compromised runner or Ollama binary. Use host-level isolation, least-privilege OS accounts, restricted network access, no unrelated secrets, and rebuildable runner images.

### 4. Hosted patch validation

- Runs on a separate `ubuntu-latest` job after the proposal job succeeds.
- Uses a source checkout with `persist-credentials: false` and `contents: read`.
- A reusable validator rejects binary patches, renames, symlinks/mode changes, hidden/traversal paths, disallowed file types, test files, dependency manifests, lockfiles, workflow files, more than 12 files, more than 1,000 changed lines, or patches above 200 KB.
- The candidate is applied only in this disposable workspace. Dependency installation disables lifecycle scripts, and configured tests/build are executed here—not on the self-hosted runner.
- Passing tests/build establishes only that those commands passed for that exact candidate; it does not establish that the patch is secure or correct.

### 5. Pull-request publisher

- Third-party GitHub Actions are pinned to full commit SHAs; CI checks every workflow to prevent moving tags/branches from being added back. These pins reduce reference mutability risk, but do not replace reviewing action source or updates.
- The local provider adapter launches only the `ollama` executable with argument-safe spawning (`shell: false`), rejects provider names other than `ollama-local`, validates the model ID, caps prompt/output size, and enforces a time limit. It does not implement a paid provider or automatic fallback. Provider errors fail closed; the task Issue is not marked complete or closed, and recovery is a user-triggered workflow re-run.
- The publisher accepts only a successful manually dispatched proposal run from this repository's default branch and requires the run to come from the expected workflow path.
- Its first job has only `actions: read`, `contents: read`, and `issues: read`; it verifies the source run and task Issue, rejects secret-like output, validates patch boundaries, applies the patch in a temporary workspace, and uploads only the validated patch with a one-day retention.
- A second job has the `contents` and `pull-requests` write permissions needed to publish. It rechecks Issue eligibility, fetches the public source anonymously, revalidates the patch, and applies it in a temporary workspace. It does not invoke the model or execute generated project code.
- `GH_TOKEN` is scoped to Issue-lookup and branch/PR steps, not the patch-validation/apply steps. Git push uses a one-command HTTP extra header rather than persisting credentials.
- It never merges. Human review of the complete diff and the PR's own CI checks remains mandatory.
- Repository settings must explicitly allow Actions to create pull requests. Keep branch protection/rulesets enabled where available.

## Threats and residual risk

| Threat | Current mitigation | Residual risk / next action |
| --- | --- | --- |
| Prompt injection in issue text or source files | Prompt treats task/source as untrusted; generated output must pass a strict path and size allowlist. | Model can still produce misleading or harmful in-scope code. Require human diff review and tests. |
| Secret accidentally committed in a source file or echoed by the model | GitHub token is not passed to model-generation steps; selected issue/source text and planner output pass a best-effort redaction step. | Regexes miss unknown formats, encoded secrets, multiline credentials other than PEM keys, and arbitrary secret literals. Model output may transform or reconstruct sensitive data. Add a dedicated secret scanner; inspect redaction behavior before enabling broadly. |
| Malicious generated diff | Reusable validator, disposable hosted candidate tests, no generated-code execution on self-hosted runner. | An allowed `src/*` change can still introduce unsafe application behavior. Review every line. |
| Compromised or persistent self-hosted runner | Dedicated disposable Linux runner is required and documented. | Workflow checks alone cannot isolate the host. Use ephemeral provisioning, restricted egress, no other credentials, and routine rebuilds. |
| Artifact substitution or wrong run | Publisher restricts triggering workflow, event, branch, repository, issue identity, and patch shape. | GitHub Actions/artifact supply-chain risk remains even with full-SHA pins; review action code and update pins deliberately. |
| Overprivileged publication token | Separate publisher workflow; scoped repository permissions; no merge permission is requested. | The publisher can write repository contents and open PRs while running. Review workflow changes and enforce repository rulesets. |
| False confidence from green CI | Workflow summaries document bounds and require human review; no automatic merge. | A green result is not a security verdict. Review diff, tests, dependencies, and workflow source. |
| Dependency supply-chain compromise | Lockfile committed; CI/Pages use `npm ci`; generated-patch tests use `npm ci --ignore-scripts`; CI blocks high/critical npm audit findings and reports lower-severity findings. | A lockfile constrains resolved versions but does not remove upstream package or action supply-chain risk; review all audit output and action versions. |

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
