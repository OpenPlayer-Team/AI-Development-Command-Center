# Roadmap

## Phase 1 — Dashboard foundation
- [x] React + TypeScript + Vite application scaffold
- [x] Dashboard UI and local task composer
- [x] Typed task helpers and unit tests
- [x] GitHub Actions CI workflow
- [x] CI tests and production build pass on a prior branch revision
- [ ] Generate and commit package lockfile
- [ ] Verify Pages deployment after merge and repository configuration

## Phase 2 — GitHub-native task management
- [x] Define a durable task record using GitHub Issues
- [x] Add a manual workflow-dispatch task intake with input validation
- [x] Apply `agent-task` and priority labels; include submitter/source commit
- [x] Limit workflow token permissions to contents:read and issues:write
- [ ] Add issue-to-dashboard synchronization (requires secure GitHub data access)
- [ ] Add a review screen that links to real issues and pull requests
- [ ] Validate the intake workflow by creating a test issue, then close/delete it as appropriate

## Phase 3 — Bounded agent runner
- [x] Add a manual task-validation preflight workflow with a short timeout and read-only permissions
- [x] Validate open issue, agent-task label, and bounded title/body length before any future execution
- [x] Add opt-in local Ollama planning workflow that creates a plan artifact only
- [x] Document dedicated runner requirements and the security boundary
- [ ] Run the local planning workflow end-to-end on a dedicated isolated runner
- [ ] Define and review a threat model and allowed tool/command policy
- [x] Add bounded patch generation and test/build validation in an ephemeral GitHub-hosted runner (workflow still requires an operational self-hosted Ollama runner)
- [x] Add a publisher workflow that opens a restricted-scope PR only after successful validation; it never merges
- [x] Extract patch boundary policy into a reusable validator and cover accepted/rejected cases in CI
- [ ] Run the local proposal → validation → PR path end-to-end on a dedicated isolated runner
- [ ] Define and review a threat model and allowed tool/command policy
- [ ] Keep untrusted task/repository content isolated from secrets
- [ ] Require explicit human review and approval before merging any agent PR

## Phase 4 — Provider routing and local fallback
- [ ] Implement provider interface and health checks
- [ ] Add provider-unavailable queue behavior and retry limits
- [ ] Enforce €0 budget with no paid fallback
- [ ] Do not route to cloud APIs unless explicitly configured and budget-approved

## Phase 5 — Release readiness
- [ ] Verify responsive UI and accessibility
- [ ] Run all tests and production build on the latest revision
- [ ] Configure GitHub Pages and verify deployment
- [ ] Commit a package lockfile and use reproducible dependency installation
- [ ] Document limitations, quotas, and operational procedures

A checklist item is complete only when implementation or verification evidence exists. A workflow file is not considered operationally verified until an actual run has been inspected.
