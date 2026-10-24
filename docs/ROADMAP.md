# Roadmap

## Phase 1 — Dashboard foundation
- [x] React + TypeScript + Vite application scaffold
- [x] Dashboard UI and local task composer
- [x] Typed task helpers and unit tests
- [x] GitHub Actions CI workflow
- [x] CI tests and production build pass on GitHub Actions
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
- [ ] Define a threat model and allowed tool/command policy
- [x] Add a manual task-validation preflight workflow with a short timeout and read-only permissions
- [x] Validate open issue, agent-task label, and bounded title/body length before any future execution
- [x] Explicitly report that no AI execution or code execution is configured
- [ ] Implement an isolated bounded execution job after provider/runner design and security review
- [ ] Store secrets only in GitHub Actions secrets
- [ ] Keep pull requests from untrusted code isolated from secrets
- [ ] Require human approval before creating or applying code changes

## Phase 4 — Provider routing and local fallback
- [ ] Implement provider interface and health checks
- [ ] Add optional local model endpoint configuration
- [ ] Queue tasks when no provider is available
- [ ] Enforce €0 budget with no paid fallback

## Phase 5 — Release readiness
- [ ] Verify responsive UI and accessibility
- [ ] Run all tests and production build
- [ ] Configure GitHub Pages and verify deployment
- [ ] Document limitations, quotas, and operational procedures

A checklist item is complete only when implementation or verification evidence exists. A workflow file is not considered operationally verified until an actual run has been inspected.
