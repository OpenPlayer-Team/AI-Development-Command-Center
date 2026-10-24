# Roadmap

## Phase 1 — Dashboard foundation
- [x] React + TypeScript + Vite application scaffold
- [x] Dashboard UI and local task composer
- [x] Typed task helpers and unit tests
- [x] GitHub Actions CI workflow
- [ ] Execute CI and resolve any failures
- [ ] Generate and commit package lockfile

## Phase 2 — GitHub-native task management
- [ ] Define issue labels and a durable task schema
- [ ] Add least-privilege GitHub App/token configuration guidance
- [ ] Implement issue creation and status synchronization through a secure workflow
- [ ] Add a review screen that links to real issues and pull requests

## Phase 3 — Bounded agent runner
- [ ] Define a threat model and allowed tool/command policy
- [ ] Add manual workflow dispatch and bounded jobs
- [ ] Store secrets only in GitHub Actions secrets
- [ ] Keep pull requests from untrusted code isolated from secrets

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

A checklist item is not complete until implementation or verification evidence exists.
