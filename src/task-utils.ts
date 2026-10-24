export type TaskStatus = 'queued' | 'running' | 'review' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  agent: string;
  updated: string;
}

export function countTasksByStatus(tasks: Task[]): Record<TaskStatus, number> {
  return tasks.reduce<Record<TaskStatus, number>>(
    (counts, task) => {
      counts[task.status] += 1;
      return counts;
    },
    { queued: 0, running: 0, review: 0, done: 0 },
  );
}

export function createTask(title: string, id = `task-${Date.now()}`): Task {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) throw new Error('Task title cannot be empty');
  return {
    id,
    title: normalizedTitle,
    project: 'AI Development Command Center',
    status: 'queued',
    priority: 'medium',
    agent: 'Coordinator',
    updated: 'just now',
  };
}
