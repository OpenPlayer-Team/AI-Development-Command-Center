import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, Bot, Boxes, Check,
  ChevronDown, CircleHelp, Clock3, Code2, Command, Cpu, GitBranch, GitPullRequest,
  LayoutDashboard, ListTodo, MessageSquare, MoreHorizontal, Plus, Search, Send,
  RefreshCw, Settings2, ShieldCheck, Sparkles, Terminal, Workflow, Zap,
} from 'lucide-react';
import { countTasksByStatus, createTask, type Task } from './task-utils';
import { fetchGitHubStatus, type GitHubLiveStatus } from './github-status';

const initialTasks: Task[] = [
  { id: 'task-104', title: 'Audit repository structure and dependencies', project: 'Command Center', status: 'done', priority: 'high', agent: 'Repository Analyst', updated: '12 min ago' },
  { id: 'task-105', title: 'Create the dashboard shell and navigation', project: 'Command Center', status: 'running', priority: 'high', agent: 'Developer', updated: '4 min ago' },
  { id: 'task-106', title: 'Add unit tests for task state transitions', project: 'Command Center', status: 'review', priority: 'medium', agent: 'Test Engineer', updated: '2 min ago' },
  { id: 'task-107', title: 'Prepare GitHub Pages deployment workflow', project: 'Command Center', status: 'queued', priority: 'medium', agent: 'Coordinator', updated: 'just now' },
  { id: 'task-108', title: 'Document local model fallback requirements', project: 'Command Center', status: 'queued', priority: 'low', agent: 'Documentation Agent', updated: 'just now' },
];

const statusLabels = { queued: 'Queued', running: 'In progress', review: 'Needs review', done: 'Completed' } as const;

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function workflowRunLabel(status: string, conclusion: string | null): string {
  if (status !== 'completed') return status.replace(/_/g, ' ');
  return conclusion ? conclusion.replace(/_/g, ' ') : 'completed';
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [taskInput, setTaskInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeNav, setActiveNav] = useState('Overview');
  const [showComposer, setShowComposer] = useState(false);
  const [githubStatus, setGithubStatus] = useState<GitHubLiveStatus | null>(null);
  const [githubStatusError, setGithubStatusError] = useState<string | null>(null);
  const [githubStatusLoading, setGithubStatusLoading] = useState(true);
  const [githubRefreshNonce, setGithubRefreshNonce] = useState(0);
  const counts = useMemo(() => countTasksByStatus(tasks), [tasks]);
  const filteredTasks = tasks.filter((task) => task.title.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const controller = new AbortController();
    setGithubStatusLoading(true);
    setGithubStatusError(null);

    fetchGitHubStatus(controller.signal)
      .then((status) => setGithubStatus(status))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setGithubStatusError(error instanceof Error ? error.message : 'Unable to load GitHub status.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setGithubStatusLoading(false);
      });

    return () => controller.abort();
  }, [githubRefreshNonce]);

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskInput.trim()) return;
    setTasks((current) => [createTask(taskInput), ...current]);
    setTaskInput('');
    setShowComposer(false);
  }

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Task queue', icon: ListTodo, count: counts.queued },
    { label: 'Agent workspace', icon: Bot },
    { label: 'GitHub activity', icon: GitBranch },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="AI Development Command Center home">
          <span className="brand-mark"><Command size={21} strokeWidth={2.4} /></span>
          <span className="brand-copy"><strong>DEV<span>COMMAND</span></strong><small>AI DEVELOPMENT CENTER</small></span>
        </a>

        <div className="workspace-switcher">
          <div className="workspace-avatar">A</div>
          <div className="workspace-copy"><strong>Personal workspace</strong><small>Free workspace</small></div>
          <ChevronDown size={15} />
        </div>

        <p className="nav-label">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon, count }) => (
            <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => setActiveNav(label)}>
              <Icon size={17} /><span>{label}</span>{count ? <span className="nav-count">{count}</span> : null}
            </button>
          ))}
        </nav>

        <p className="nav-label nav-label-spaced">DEVELOPMENT</p>
        <nav className="primary-nav" aria-label="Development navigation">
          <button className="nav-item" onClick={() => setActiveNav('Pull requests')}><GitPullRequest size={17} /><span>Pull requests</span><span className="nav-count">1</span></button>
          <button className="nav-item" onClick={() => setActiveNav('Workflows')}><Workflow size={17} /><span>Workflows</span></button>
          <button className="nav-item" onClick={() => setActiveNav('Terminal logs')}><Terminal size={17} /><span>Terminal logs</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="quota-card">
            <div className="quota-heading"><Zap size={15} /><span>Zero-cost mode</span><span className="status-dot" /></div>
            <p>No paid services are enabled. AI execution is not connected yet.</p>
            <div className="quota-track"><span /></div>
            <div className="quota-meta"><span>Budget used</span><strong>€0.00 / €0</strong></div>
          </div>
          <button className="nav-item" onClick={() => setActiveNav('Settings')}><Settings2 size={17} /><span>Settings</span></button>
          <button className="profile-button"><div className="profile-avatar">U</div><span className="profile-copy"><strong>Workspace owner</strong><small>No account connected</small></span><MoreHorizontal size={17} /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <div className="environment-pill"><span className="status-dot" /> DEMO ENVIRONMENT</div>
            <button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button>
            <button className="icon-button" aria-label="Activity"><Activity size={18} /></button>
            <div className="top-avatar">U</div>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR SOFTWARE WORKSPACE</div>
              <h1>Build something <span>extraordinary.</span></h1>
              <p className="welcome-subtitle">Your development command center. One place to plan, build, test, and review.</p><a className="durable-task-link" href="https://github.com/OpenPlayer-Team/AI-Development-Command-Center/actions/workflows/task-intake.yml" target="_blank" rel="noreferrer">Create a durable GitHub task <ArrowUpRight size={14} /></a>
            </div>
            <button className="primary-button" onClick={() => setShowComposer((open) => !open)}><Plus size={17} /> New task</button>
          </section>

          <div className="notice-banner">
            <div className="notice-icon"><ShieldCheck size={18} /></div>
            <div className="notice-copy"><strong>Safe mode is on</strong><span>This dashboard currently uses local demo state. No AI provider, remote command runner, or automatic merge is active.</span></div>
            <span className="notice-tag">SETUP IN PROGRESS</span>
          </div>

          {showComposer && (
            <section className="composer-panel">
              <div className="composer-heading"><div className="composer-icon"><MessageSquare size={18} /></div><div><strong>What should we work on?</strong><p>This quick form is a local preview only. Use the GitHub workflow to save a durable task.</p></div></div>
              <form onSubmit={submitTask} className="task-form">
                <input autoFocus value={taskInput} onChange={(event) => setTaskInput(event.target.value)} placeholder="e.g. Add authentication tests to my repository…" aria-label="New task description" />
                <button className="primary-button" type="submit" disabled={!taskInput.trim()}><Send size={15} /> Add task</button>
              </form>
              <p className="composer-footnote"><Sparkles size={13} /> Demo-only: browser memory, no code execution or AI call. <a href="https://github.com/OpenPlayer-Team/AI-Development-Command-Center/actions/workflows/task-intake.yml" target="_blank" rel="noreferrer">Open durable task intake <ArrowUpRight size={12} /></a></p>
            </section>
          )}

          <section className="metrics-grid" aria-label="Task metrics">
            <MetricCard label="Total tasks" value={String(tasks.length).padStart(2, '0')} caption="Tracked in this session" icon={<ListTodo size={18} />} tone="violet" trend="Workspace" />
            <MetricCard label="In progress" value={String(counts.running).padStart(2, '0')} caption="Currently being worked on" icon={<Activity size={18} />} tone="blue" trend="Live state" />
            <MetricCard label="Awaiting review" value={String(counts.review).padStart(2, '0')} caption="Human review required" icon={<GitPullRequest size={18} />} tone="amber" trend="Approval gate" />
            <MetricCard label="Completed" value={String(counts.done).padStart(2, '0')} caption="Marked as completed" icon={<Check size={18} />} tone="green" trend="Session total" />
          </section>

          <section className="content-grid">
            <div className="panel task-panel">
              <div className="panel-heading">
                <div><div className="section-title">Task queue <span className="tiny-count">{tasks.length}</span></div><p>Track work from idea to review.</p></div>
                <div className="panel-heading-actions">
                  <label className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" aria-label="Search tasks" /></label>
                  <button className="subtle-button" onClick={() => setShowComposer(true)}><Plus size={15} /> Add</button>
                </div>
              </div>
              <div className="task-table">
                <div className="task-table-head"><span>TASK</span><span>STATUS</span><span>PRIORITY</span><span>UPDATED</span></div>
                {filteredTasks.map((task) => (
                  <div className="task-row" key={task.id}>
                    <div className="task-name-cell"><span className={`task-state-icon state-${task.status}`}>{task.status === 'done' ? <Check size={13} /> : task.status === 'running' ? <Activity size={13} /> : task.status === 'review' ? <GitPullRequest size={13} /> : <Clock3 size={13} />}</span><div className="task-title-wrap"><strong>{task.title}</strong><small>{task.id} · {task.agent}</small></div></div>
                    <div><span className={`status-badge badge-${task.status}`}><span />{statusLabels[task.status]}</span></div>
                    <div><span className={`priority priority-${task.priority}`}>{task.priority}</span></div>
                    <span className="updated-text">{task.updated}</span>
                  </div>
                ))}
                {filteredTasks.length === 0 && <div className="empty-state">No tasks match “{search}”. Try another search.</div>}
              </div>
              <div className="panel-footer"><span>Showing {filteredTasks.length} of {tasks.length} tasks</span><button onClick={() => setActiveNav('Task queue')}>Open task queue <ArrowRight size={14} /></button></div>
            </div>

            <div className="right-column">
              <section className="panel agent-panel">
                <div className="panel-heading compact"><div><div className="section-title">Agent workspace</div><p>Specialists planned for the workflow</p></div><button className="more-button" aria-label="More agent options"><MoreHorizontal size={18} /></button></div>
                <div className="agent-list">
                  <AgentRow icon={<Command size={16} />} name="Coordinator" description="Plans and routes tasks" color="violet" status="Designed" />
                  <AgentRow icon={<Search size={16} />} name="Repository analyst" description="Maps code and dependencies" color="blue" status="Designed" />
                  <AgentRow icon={<Code2 size={16} />} name="Developer" description="Implements approved changes" color="cyan" status="Not connected" />
                  <AgentRow icon={<Check size={16} />} name="Test engineer" description="Runs checks and reports proof" color="green" status="Not connected" />
                </div>
                <div className="agent-note"><Bot size={15} /><span>Agent execution becomes available after a secure runner and provider are configured.</span></div>
              </section>

              <section className="panel github-panel">
                <div className="panel-heading compact"><div><div className="section-title">GitHub repository</div><p>Repository-first workflow</p></div><GitBranch size={17} className="muted-icon" /></div>
                <div className="repo-card">
                  <div className="repo-icon"><Boxes size={17} /></div>
                  <div className="repo-details"><strong>AI-Development-Command-Center</strong><span><span className="repo-dot" /> {githubStatus?.repository.visibility ?? (githubStatusLoading ? 'Loading visibility…' : 'Visibility unavailable')}</span></div>
                  <span className="repo-visibility">{githubStatus?.repository.visibility.toUpperCase() ?? (githubStatusLoading ? 'LOADING' : 'UNKNOWN')}</span>
                </div>
                <div className="repo-stats"><div><span>Default branch</span><strong><GitBranch size={13} /> {githubStatus?.repository.defaultBranch ?? (githubStatusLoading ? 'Loading…' : 'Unavailable')}</strong></div><div><span>Merge policy</span><strong><ShieldCheck size={13} /> Human approval</strong></div></div>
                <div className="github-live-section">
                  <div className="github-live-heading">
                    <span>LIVE GITHUB STATUS</span>
                    <button type="button" className="github-refresh" aria-label="Refresh GitHub status" title="Refresh GitHub status" disabled={githubStatusLoading} onClick={() => setGithubRefreshNonce((value) => value + 1)}>
                      <RefreshCw size={13} className={githubStatusLoading ? 'refresh-spinning' : ''} />
                    </button>
                  </div>
                  {githubStatusLoading && !githubStatus && <p className="github-live-muted">Loading public repository data…</p>}
                  {githubStatusError && <p className="github-live-error" role="status">{githubStatusError}</p>}
                  {githubStatus && (
                    <>
                      <div className="github-live-group">
                        <div className="github-live-subheading"><span>Open pull requests</span><span>{githubStatus.openPullRequests.length}</span></div>
                        {githubStatus.openPullRequests.length === 0
                          ? <p className="github-live-muted">No open pull requests.</p>
                          : githubStatus.openPullRequests.map((pullRequest) => (
                            <a className="github-live-row" href={pullRequest.htmlUrl} key={pullRequest.number} target="_blank" rel="noreferrer">
                              <GitPullRequest size={13} />
                              <span className="github-live-row-copy"><strong>#{pullRequest.number} {pullRequest.title}</strong><small>{pullRequest.headBranch}{pullRequest.draft ? ' · Draft' : ''}</small></span>
                              <ArrowUpRight size={12} />
                            </a>
                          ))}
                      </div>
                      <div className="github-live-group">
                        <div className="github-live-subheading"><span>Recent workflows</span><span>{githubStatus.recentWorkflowRuns.length}</span></div>
                        {githubStatus.recentWorkflowRuns.length === 0
                          ? <p className="github-live-muted">No workflow runs found.</p>
                          : githubStatus.recentWorkflowRuns.map((run) => (
                            <a className="github-live-row" href={run.htmlUrl} key={run.id} target="_blank" rel="noreferrer">
                              <span className={`github-run-dot run-${run.conclusion ?? run.status}`} />
                              <span className="github-live-row-copy"><strong>{run.name} · {workflowRunLabel(run.status, run.conclusion)}</strong><small>{run.branch}</small></span>
                              <ArrowUpRight size={12} />
                            </a>
                          ))}
                      </div>
                      <p className="github-live-updated">Updated {formatTimestamp(githubStatus.fetchedAt)}</p>
                    </>
                  )}
                </div>
                <a className="github-link" href={githubStatus?.repository.htmlUrl ?? 'https://github.com/OpenPlayer-Team/AI-Development-Command-Center'} target="_blank" rel="noreferrer">Open repository <ArrowUpRight size={14} /></a>
              </section>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="panel activity-panel">
              <div className="panel-heading compact"><div><div className="section-title">Recent activity</div><p>Events shown for this interface preview</p></div><button className="more-button" aria-label="More activity options"><MoreHorizontal size={18} /></button></div>
              <div className="activity-list">
                <ActivityRow icon={<GitBranch size={15} />} color="violet" title="Feature branch created" detail="feat/phase-1-dashboard-foundation" time="Just now" />
                <ActivityRow icon={<Code2 size={15} />} color="blue" title="Frontend foundation added" detail="React + TypeScript + Vite scaffold" time="Just now" />
                <ActivityRow icon={<ShieldCheck size={15} />} color="green" title="Human approval policy documented" detail="No automatic merges" time="Just now" />
              </div>
            </div>
            <div className="panel next-panel">
              <div className="next-icon"><Cpu size={19} /></div>
              <div className="next-copy"><span className="eyebrow">NEXT MILESTONE</span><h3>Connect the execution layer</h3><p>Wire GitHub Issues and Actions, then add an optional local-model runner without paid hosting.</p><button onClick={() => setActiveNav('Workflows')}>View workflow plan <ArrowRight size={14} /></button></div>
            </div>
          </section>

          <footer className="app-footer"><span><span className="footer-dot" /> System interface online</span><span>Phase 1 · Dashboard foundation <span className="footer-separator">/</span> Build verification pending</span><span>Made for responsible autonomy <Sparkles size={12} /></span></footer>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, caption, icon, tone, trend }: { label: string; value: string; caption: string; icon: ReactNode; tone: string; trend: string }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon tone-${tone}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-bottom"><span>{caption}</span><span className="metric-trend">{trend}</span></div></div>;
}

function AgentRow({ icon, name, description, color, status }: { icon: React.ReactNode; name: string; description: string; color: string; status: string }) {
  return <div className="agent-row"><span className={`agent-icon agent-${color}`}>{icon}</span><div className="agent-copy"><strong>{name}</strong><small>{description}</small></div><span className={status === 'Designed' ? 'agent-status designed' : 'agent-status'}>{status}</span></div>;
}

function ActivityRow({ icon, color, title, detail, time }: { icon: React.ReactNode; color: string; title: string; detail: string; time: string }) {
  return <div className="activity-row"><span className={`activity-icon activity-${color}`}>{icon}</span><div className="activity-copy"><strong>{title}</strong><small>{detail}</small></div><span className="activity-time">{time}</span></div>;
}

export default App;
