import { describe, expect, it } from 'vitest';
import { countTasksByStatus, createTask, type Task } from './task-utils';

const tasks: Task[] = [
  { id: '1', title: 'Inspect repo', project: 'Core', status: 'done', priority: 'low', agent: 'Analyst', updated: 'today' },
  { id: '2', title: 'Build UI', project: 'Core', status: 'running', priority: 'high', agent: 'Developer', updated: 'today' },
  { id: '3', title: 'Add tests', project: 'Core', status: 'queued', priority: 'medium', agent: 'Tester', updated: 'today' },
];

describe('countTasksByStatus', () => {
  it('counts each task status and initializes missing statuses to zero', () => {
    expect(countTasksByStatus(tasks)).toEqual({ queued: 1, running: 1, review: 0, done: 1 });
  });
});

describe('createTask', () => {
  it('trims the title and queues the task', () => {
    expect(createTask('  Fix the build  ', 'fixed')).toMatchObject({ id: 'fixed', title: 'Fix the build', status: 'queued' });
  });

  it('rejects an empty title', () => {
    expect(() => createTask('   ')).toThrow('Task title cannot be empty');
  });
});
