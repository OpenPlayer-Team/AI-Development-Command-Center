# Roadmap

## Phase 1 — Dashboard foundation
- [x] React + TypeScript + Vite application scaffold
- [x] Dashboard UI and local task composer
- [x] Typed task helpers and unit tests
- [x] GitHub Actions CI workflow
- [x] CI run on commit `20c72c48ace7dd736fdfe934fee0caf677b528ee` passed workflow lint, patch-policy tests, redaction tests, **14 unit tests**, production build, and npm audit with **0 vulnerabilities**; repeat on each release candidate
- [x] Generate and commit package lockfile
- [ ] Verify Pages deployment after merge and repository configuration

## Phase 2 — GitHub-native task management
- [x] Define a durable task record using GitHub Issues
- [x] Add a manual workflow-dispatch task intake with input validation
- [x] Apply `agent-task` and priority labels; include submitter/source commit
- [x] Least-privilege task intake (`issues: write` only) and preflight (`issues: read` only) token permissions
- [x] Add anonymous read-only sync for public `agent-task` issues, open pull requests, and recent Actions runs (private repositories need future secure authentication)
- [x] Add live read-only dashboard status for public repository metadata, open pull requests, and recent Actions runs
- [x] Add focused review/queue views that link to real GitHub issues and pull requests
- [x] Give sidebar destinations dedicated views for tasks, agents, activity, pull requests, workflows, logs guidance, and settings
- [ ] Validate the intake workflow by creating a test issue, then close/delete it as appropriate

## Phase 3 — Bounded agent runner
- [x] Add a manual task-validation preflight workflow with a short timeout and read-only permissions
- [x] Validate open issue, agent-task label, and bounded title/body length before any future execution
- [x] Add opt-in local Ollama planning workflow that creates a plan artifact only
- [x] Document dedicated runner requirements and the security boundary
- [ ] Run the local planning workflow end-to-end on a dedicated isolated runner
- [x] Document the initial threat model and command boundaries in `docs/THREAT-MODEL.md`
- [ ] Independently review the threat model and command policy
- [x] Add bounded patch generation and test/build validation in an ephemeral GitHub-hosted runner (workflow still requires an operational self-hosted Ollama runner)
- [x] Add a publisher workflow that opens a restricted-scope PR only after successful validation; it never merges
- [x] Extract patch boundary policy into a reusable validator and cover accepted/rejected cases in CI
- [ ] Run the local proposal → validation → PR path end-to-end on a dedicated isolated runner
- [x] Add best-effort redaction for common service tokens, key/password assignments, bearer tokens, credential URLs, JWT-like strings, and PEM private keys in planner issue input, planner output, and patch-proposal context
- [x] Reject generated patch output when redaction detects secret-like material and clean local context/artifacts after upload
- [ ] Add a dedicated secret scanner and review redaction false positives/negatives; regex redaction cannot guarantee all secrets are removed
- [ ] Require explicit human review and approval before merging any agent PR

## Phase 4 — Provider routing and local fallback
- [ ] Implement provider interface and health checks
- [ ] Add provider-unavailable queue behavior and retry limits
- [ ] Enforce €0 budget with no paid fallback
- [ ] Do not route to cloud APIs unless explicitly configured and budget-approved

## Phase 5 — Release readiness
- [ ] Verify responsive UI and accessibility on actual desktop/mobile browsers
- [x] Run all tests and production build on implementation revision `20c72c48ace7dd736fdfe934fee0caf677b528ee` (repeat before release)
- [ ] Configure GitHub Pages and verify deployment
- [x] Commit package lockfile and use reproducible dependency installation via `npm ci`
- [ ] Document limitations, quotas, and operational procedures

A checklist item is complete only when implementation or verification evidence exists. A workflow file is not considered operationally verified until an actual run has been inspected.
