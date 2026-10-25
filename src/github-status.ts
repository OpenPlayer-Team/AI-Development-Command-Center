const OWNER = 'OpenPlayer-Team';
const REPOSITORY = 'AI-Development-Command-Center';
const API_BASE = 'https://api.github.com';

export const GITHUB_REPOSITORY_URL = `https://github.com/${OWNER}/${REPOSITORY}`;
export const GITHUB_TASK_INTAKE_URL = `${GITHUB_REPOSITORY_URL}/actions/workflows/task-intake.yml`;
export const GITHUB_ACTIONS_URL = `${GITHUB_REPOSITORY_URL}/actions`;
export const GITHUB_OLLAMA_HEALTH_URL = `${GITHUB_REPOSITORY_URL}/actions/workflows/local-ollama-health.yml`;
export const LOCAL_AGENT_RUNNER_DOC_URL = `${GITHUB_REPOSITORY_URL}/blob/main/docs/LOCAL-AGENT-RUNNER.md`;

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

export interface AgentIssueSummary {
  number: number;
  title: string;
  htmlUrl: string;
  labels: string[];
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
  openAgentTasks: AgentIssueSummary[];
  recentWorkflowRuns: WorkflowRunSummary[];
  localOllamaHealthRun: WorkflowRunSummary | null;
  warnings: string[];
  fetchedAt: string;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown, context: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`GitHub returned an invalid ${context} response.`);
  }
  return value as JsonRecord;
}

function recordOrNull(value: unknown): JsonRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
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
  const visibility: RepositorySummary['visibility'] =
    rawVisibility === 'private' || rawVisibility === 'internal' || rawVisibility === 'public'
      ? rawVisibility
      : isPrivate
        ? 'private'
        : 'public';

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

function parseAgentIssues(value: unknown): AgentIssueSummary[] {
  if (!Array.isArray(value)) throw new Error('GitHub returned an invalid agent-task list.');

  return value
    .filter((entry) => {
      const raw = asRecord(entry, 'issue');
      // GitHub's issues endpoint also returns pull requests; task records must be issues.
      if (raw.pull_request) return false;
      const labels = Array.isArray(raw.labels) ? raw.labels : [];
      return labels.some((label) => recordOrNull(label)?.name === 'agent-task');
    })
    .slice(0, 5)
    .map((entry) => {
      const raw = asRecord(entry, 'issue');
      const labels = Array.isArray(raw.labels)
        ? raw.labels.flatMap((label) => {
            const record = recordOrNull(label);
            return typeof record?.name === 'string' && record.name.length > 0 ? [record.name] : [];
          })
        : [];
      return {
        number: asNumber(raw.number, 'issue number'),
        title: asString(raw.title, 'issue title'),
        htmlUrl: asGitHubUrl(raw.html_url, 'issue URL'),
        labels,
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

function parseLatestWorkflowRun(value: unknown): WorkflowRunSummary | null {
  return parseWorkflowRuns(value)[0] ?? null;
}

/**
 * Reads public repository metadata, open pull requests, and recent Actions runs.
 * It deliberately uses no credential and grants the browser no write capability.
 * Private repositories and anonymous API rate limits are surfaced as a display error.
 */
function parseOptionalResult<T>(
  result: PromiseSettledResult<unknown>,
  label: string,
  parser: (value: unknown) => T,
  fallback: T,
  warnings: string[],
): T {
  if (result.status === 'rejected') {
    warnings.push(label);
    return fallback;
  }

  try {
    return parser(result.value);
  } catch {
    warnings.push(label);
    return fallback;
  }
}

/**
 * Reads public repository metadata, open pull requests, open agent-task issues,
 * and recent Actions runs without credentials or write capability.
 * Repository metadata is required; secondary panels degrade independently.
 */
export async function fetchGitHubStatus(signal?: AbortSignal): Promise<GitHubLiveStatus> {
  const encodedOwner = encodeURIComponent(OWNER);
  const encodedRepository = encodeURIComponent(REPOSITORY);
  const base = `/repos/${encodedOwner}/${encodedRepository}`;

  const [repositoryResult, pullRequestsResult, agentIssuesResult, workflowRunsResult, localOllamaHealthResult] = await Promise.allSettled([
    getJson(base, signal),
    getJson(`${base}/pulls?state=open&per_page=5`, signal),
    getJson(`${base}/issues?state=open&labels=agent-task&per_page=5`, signal),
    getJson(`${base}/actions/runs?per_page=3`, signal),
    getJson(`${base}/actions/workflows/local-ollama-health.yml/runs?per_page=1`, signal),
  ]);

  if (signal?.aborted) {
    throw repositoryResult.status === 'rejected' ? repositoryResult.reason : new Error('GitHub request aborted.');
  }
  if (repositoryResult.status === 'rejected') throw repositoryResult.reason;

  const warnings: string[] = [];
  const parsedRepository = parseRepository(repositoryResult.value);
  const openPullRequests = parseOptionalResult(
    pullRequestsResult,
    'Open pull requests could not be loaded.',
    parsePullRequests,
    [],
    warnings,
  );
  const openAgentTasks = parseOptionalResult(
    agentIssuesResult,
    'Agent tasks could not be loaded.',
    parseAgentIssues,
    [],
    warnings,
  );
  const recentWorkflowRuns = parseOptionalResult(
    workflowRunsResult,
    'Recent workflow runs could not be loaded.',
    parseWorkflowRuns,
    [],
    warnings,
  );
  const localOllamaHealthRun = parseOptionalResult(
    localOllamaHealthResult,
    'Local Ollama health-check status could not be loaded.',
    parseLatestWorkflowRun,
    null,
    warnings,
  );

  return {
    repository: parsedRepository,
    openPullRequests,
    openAgentTasks,
    recentWorkflowRuns,
    localOllamaHealthRun,
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}
