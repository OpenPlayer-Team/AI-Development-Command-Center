import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGitHubStatus, GITHUB_REPOSITORY_URL, GITHUB_TASK_INTAKE_URL, GITHUB_ACTIONS_URL, LOCAL_AGENT_RUNNER_DOC_URL } from './github-status';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const repository = {
  full_name: 'OpenPlayer-Team/AI-Development-Command-Center',
  private: false,
  visibility: 'public',
  default_branch: 'main',
  html_url: 'https://github.com/OpenPlayer-Team/AI-Development-Command-Center',
};

const pullRequests = [
  {
    number: 1,
    title: 'Phase 1: dashboard foundation',
    html_url: 'https://github.com/OpenPlayer-Team/AI-Development-Command-Center/pull/1',
    head: { ref: 'feat/phase-1-dashboard-foundation' },
    draft: false,
    updated_at: '2026-10-24T18:00:00Z',
  },
];

const agentIssues = [
  {
    number: 42,
    title: 'Implement the local agent runner',
    html_url: 'https://github.com/OpenPlayer-Team/AI-Development-Command-Center/issues/42',
    labels: [{ name: 'agent-task' }, { name: 'priority:high' }],
    updated_at: '2026-10-24T18:00:00Z',
  },
  {
    number: 43,
    title: 'Pull requests must not be listed as tasks',
    html_url: 'https://github.com/OpenPlayer-Team/AI-Development-Command-Center/pull/43',
    pull_request: { url: 'https://api.github.com/repos/OpenPlayer-Team/AI-Development-Command-Center/pulls/43' },
    labels: [{ name: 'agent-task' }],
    updated_at: '2026-10-24T18:00:00Z',
  },
];

const workflowRuns = {
  workflow_runs: [
    {
      id: 100,
      name: 'CI',
      status: 'completed',
      conclusion: 'success',
      html_url: 'https://github.com/OpenPlayer-Team/AI-Development-Command-Center/actions/runs/100',
      head_branch: 'feat/phase-1-dashboard-foundation',
      updated_at: '2026-10-24T18:00:00Z',
    },
  ],
};

describe('canonical repository links', () => {
  it('derives the dashboard links from one repository base', () => {
    expect(GITHUB_REPOSITORY_URL).toBe('https://github.com/OpenPlayer-Team/AI-Development-Command-Center');
    expect(GITHUB_TASK_INTAKE_URL).toBe(GITHUB_REPOSITORY_URL + '/actions/workflows/task-intake.yml');
    expect(GITHUB_ACTIONS_URL).toBe(GITHUB_REPOSITORY_URL + '/actions');
    expect(LOCAL_AGENT_RUNNER_DOC_URL).toBe(GITHUB_REPOSITORY_URL + '/blob/main/docs/LOCAL-AGENT-RUNNER.md');
  });
});

describe('fetchGitHubStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads repository visibility, open pull requests and recent workflow runs without credentials', async () => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/pulls?state=open&per_page=5')) return jsonResponse(pullRequests);
      if (url.endsWith('/issues?state=open&labels=agent-task&per_page=5')) return jsonResponse(agentIssues);
      if (url.endsWith('/actions/runs?per_page=3')) return jsonResponse(workflowRuns);
      return jsonResponse(repository);
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchGitHubStatus();

    expect(result.repository).toMatchObject({
      fullName: repository.full_name,
      visibility: 'public',
      defaultBranch: 'main',
    });
    expect(result.openPullRequests).toHaveLength(1);
    expect(result.openPullRequests[0]).toMatchObject({
      number: 1,
      headBranch: 'feat/phase-1-dashboard-foundation',
      draft: false,
    });
    expect(result.openAgentTasks).toHaveLength(1);
    expect(result.openAgentTasks[0]).toMatchObject({
      number: 42,
      title: 'Implement the local agent runner',
      labels: ['agent-task', 'priority:high'],
    });
    expect(result.recentWorkflowRuns[0]).toMatchObject({
      id: 100,
      name: 'CI',
      status: 'completed',
      conclusion: 'success',
    });
    expect(result.fetchedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(mockFetch).toHaveBeenCalledTimes(4);
    for (const [input, init] of mockFetch.mock.calls) {
      expect(String(input)).toMatch(/^https:\/\/api\.github\.com\//);
      expect(init?.method).toBe('GET');
      expect(init?.headers).not.toHaveProperty('Authorization');
    }
  });

  it('preserves private visibility reported by the API', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/pulls?state=open&per_page=5')) return jsonResponse([]);
      if (url.endsWith('/issues?state=open&labels=agent-task&per_page=5')) return jsonResponse([]);
      if (url.endsWith('/actions/runs?per_page=3')) return jsonResponse({ workflow_runs: [] });
      return jsonResponse({ ...repository, private: true, visibility: 'private' });
    }));

    await expect(fetchGitHubStatus()).resolves.toMatchObject({
      repository: { visibility: 'private' },
      openPullRequests: [],
      recentWorkflowRuns: [],
    });
  });

  it('surfaces unavailable or rate-limited API responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Not Found' }, 404)));

    await expect(fetchGitHubStatus()).rejects.toThrow('GitHub API request failed (404)');
  });

  it('does not expose non-GitHub links and keeps other status panels available', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/pulls?state=open&per_page=5')) {
        return jsonResponse([{ ...pullRequests[0], html_url: 'https://evil.example/steal' }]);
      }
      if (url.endsWith('/issues?state=open&labels=agent-task&per_page=5')) return jsonResponse(agentIssues);
      if (url.endsWith('/actions/runs?per_page=3')) return jsonResponse(workflowRuns);
      return jsonResponse(repository);
    }));

    await expect(fetchGitHubStatus()).resolves.toMatchObject({
      repository: { fullName: repository.full_name },
      openPullRequests: [],
      openAgentTasks: [{ number: 42 }],
      warnings: ['Open pull requests could not be loaded.'],
    });
  });

  it('keeps repository and issue data when the workflow API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/pulls?state=open&per_page=5')) return jsonResponse(pullRequests);
      if (url.endsWith('/issues?state=open&labels=agent-task&per_page=5')) return jsonResponse(agentIssues);
      if (url.endsWith('/actions/runs?per_page=3')) return jsonResponse({ message: 'Forbidden' }, 403);
      return jsonResponse(repository);
    }));

    await expect(fetchGitHubStatus()).resolves.toMatchObject({
      repository: { visibility: 'public' },
      openPullRequests: [{ number: 1 }],
      openAgentTasks: [{ number: 42 }],
      recentWorkflowRuns: [],
      warnings: ['Recent workflow runs could not be loaded.'],
    });
  });});
