const OWNER = 'OpenPlayer-Team';
const REPOSITORY = 'AI-Development-Command-Center';
const API_BASE = 'https://api.github.com';

export interface RepositorySummary {
  fullName: string;
  visibility: 'public' | 'private' | 'internal';
  defaultBranch: string;
  htmlUrl: string;
}

export interface PullRequestSummary {
  number: number;
  title: string;
  htmlUrl: string;
  headBranch: string;
  draft: boolean;
  updatedAt: string;
}

export interface WorkflowRunSummary {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  branch: string;
  updatedAt: string;
}

export interface GitHubLiveStatus {
  repository: RepositorySummary;
  openPullRequests: PullRequestSummary[];
  recentWorkflowRuns: WorkflowRunSummary[];
  fetchedAt: string;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown, context: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`GitHub returned an invalid ${context} response.`);
  }
  return value as JsonRecord;
}

function asString(value: unknown, context: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`GitHub response is missing ${context}.`);
  }
  return value;
}

function asNumber(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`GitHub response is missing ${context}.`);
  }
  return value;
}

function asGitHubUrl(value: unknown, context: string): string {
  const input = asString(value, context);
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password) {
      throw new Error();
    }
    return url.toString();
  } catch {
    throw new Error(`GitHub response contains an unsafe URL for ${context}.`);
  }
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed (${response.status}). Public read access may be unavailable or rate-limited.`,
    );
  }

  return response.json() as Promise<unknown>;
}

function parseRepository(value: unknown): RepositorySummary {
  const raw = asRecord(value, 'repository');
  const isPrivate = raw.private === true;
  const rawVisibility = typeof raw.visibility === 'string' ? raw.visibility : isPrivate ? 'private' : 'public';
  const visibility = rawVisibility === 'private' || rawVisibility === 'internal' ? rawVisibility : 'public';

  return {
    fullName: asString(raw.full_name, 'repository name'),
    visibility,
    defaultBranch: asString(raw.default_branch, 'default branch'),
    htmlUrl: asGitHubUrl(raw.html_url, 'repository URL'),
  };
}

function parsePullRequests(value: unknown): PullRequestSummary[] {
  if (!Array.isArray(value)) throw new Error('GitHub returned an invalid pull-request list.');

  return value.slice(0, 5).map((entry) => {
    const raw = asRecord(entry, 'pull request');
    const head = asRecord(raw.head, 'pull-request branch');
    return {
      number: asNumber(raw.number, 'pull-request number'),
      title: asString(raw.title, 'pull-request title'),
      htmlUrl: asGitHubUrl(raw.html_url, 'pull-request URL'),
      headBranch: asString(head.ref, 'pull-request branch name'),
      draft: raw.draft === true,
      updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : '',
    };
  });
}

function parseWorkflowRuns(value: unknown): WorkflowRunSummary[] {
  const root = asRecord(value, 'workflow-run list');
  if (!Array.isArray(root.workflow_runs)) throw new Error('GitHub returned an invalid workflow-run list.');

  return root.workflow_runs.slice(0, 3).map((entry) => {
    const raw = asRecord(entry, 'workflow run');
    return {
      id: asNumber(raw.id, 'workflow-run ID'),
      name: asString(raw.name, 'workflow-run name'),
      status: asString(raw.status, 'workflow-run status'),
      conclusion: typeof raw.conclusion === 'string' ? raw.conclusion : null,
      htmlUrl: asGitHubUrl(raw.html_url, 'workflow-run URL'),
      branch: asString(raw.head_branch, 'workflow-run branch'),
      updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : '',
    };
  });
}

/**
 * Reads public repository metadata, open pull requests, and recent Actions runs.
 * It deliberately uses no credential and grants the browser no write capability.
 * Private repositories and anonymous API rate limits are surfaced as a display error.
 */
export async function fetchGitHubStatus(signal?: AbortSignal): Promise<GitHubLiveStatus> {
  const encodedOwner = encodeURIComponent(OWNER);
  const encodedRepository = encodeURIComponent(REPOSITORY);
  const base = `/repos/${encodedOwner}/${encodedRepository}`;

  const [repository, pullRequests, workflowRuns] = await Promise.all([
    getJson(base, signal),
    getJson(`${base}/pulls?state=open&per_page=5`, signal),
    getJson(`${base}/actions/runs?per_page=3`, signal),
  ]);

  return {
    repository: parseRepository(repository),
    openPullRequests: parsePullRequests(pullRequests),
    recentWorkflowRuns: parseWorkflowRuns(workflowRuns),
    fetchedAt: new Date().toISOString(),
  };
}
