import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

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

function installGitHubFetch(statusCode = 200) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (statusCode !== 200) return jsonResponse({ message: 'Not Found' }, statusCode);
    if (url.includes('/pulls?')) return jsonResponse(pullRequests);
    if (url.includes('/issues?')) return jsonResponse(agentIssues);
    if (url.includes('/actions/runs?')) return jsonResponse(workflowRuns);
    return jsonResponse(repository);
  }));
}

describe('dashboard GitHub status panel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows current repository metadata, open pull requests and recent workflow status', async () => {
    installGitHubFetch();
    render(<App />);

    const pullRequest = await screen.findByRole('link', {
      name: /#1 Phase 1: dashboard foundation/,
    });
    expect(pullRequest).toHaveAttribute(
      'href',
      'https://github.com/OpenPlayer-Team/AI-Development-Command-Center/pull/1',
    );
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /#42 Implement the local agent runner/ })).toHaveAttribute(
      'href',
      'https://github.com/OpenPlayer-Team/AI-Development-Command-Center/issues/42',
    );
    expect(screen.getByRole('link', { name: /CI · success/ })).toHaveAttribute(
      'href',
      'https://github.com/OpenPlayer-Team/AI-Development-Command-Center/actions/runs/100',
    );
  });

  it('explains when GitHub public read access is unavailable', async () => {
    installGitHubFetch(404);
    render(<App />);

    expect(await screen.findByRole('status')).toHaveTextContent(
      'GitHub API request failed (404)',
    );
    await waitFor(() => expect(screen.queryByRole('link', { name: /#1 Phase 1/ })).not.toBeInTheDocument());
  });
});
