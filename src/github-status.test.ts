import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGitHubStatus } from './github-status';

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

describe('fetchGitHubStatus', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads repository visibility, open pull requests and recent workflow runs without credentials', async () => {
    const mockFetch = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/pulls?state=open&per_page=5')) return jsonResponse(pullRequests);
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
    expect(result.recentWorkflowRuns[0]).toMatchObject({
      id: 100,
      name: 'CI',
      status: 'completed',
      conclusion: 'success',
    });
    expect(result.fetchedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    for (const [input, init] of mockFetch.mock.calls) {
      expect(String(input)).toMatch(/^https:\/\/api\.github\.com\//);
      expect(init?.method).toBe('GET');
      expect(init?.headers).not.toHaveProperty('Authorization');
    }
  });

  it('preserves private visibility reported by the API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      ...repository,
      private: true,
      visibility: 'private',
    })));

    await expect(fetchGitHubStatus()).resolves.toMatchObject({
      repository: { visibility: 'private' },
    });
  });

  it('surfaces unavailable or rate-limited API responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Not Found' }, 404)));

    await expect(fetchGitHubStatus()).rejects.toThrow('GitHub API request failed (404)');
  });

  it('rejects non-GitHub links in API content', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/pulls?state=open&per_page=5')) {
        return jsonResponse([{ ...pullRequests[0], html_url: 'https://evil.example/steal' }]);
      }
      if (url.endsWith('/actions/runs?per_page=3')) return jsonResponse(workflowRuns);
      return jsonResponse(repository);
    }));

    await expect(fetchGitHubStatus()).rejects.toThrow('unsafe URL');
  });
});
