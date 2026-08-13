import { OutputLine } from './types';

// Long-running commands rendered in their own bounded box instead of the
// terminal stream.
//
// An installer emits hundreds of lines. In a shared scrollback that buries
// everything before it, and there is no way to collapse it afterwards. A task
// owns its output: fixed height, its own scroll, collapsible when finished, and
// the terminal keeps a single summary line.
//
// This is a plain store rather than React state so the terminal component and
// the panel can both reach it without threading props through, and so a task
// survives the terminal being unmounted mid-run.

export type TaskStatus = 'running' | 'done' | 'failed';

export interface Task {
  id: number;
  command: string;
  status: TaskStatus;
  lines: OutputLine[];
  exitCode?: number;
  startedAt: number;
  endedAt?: number;
  /** Collapsed in the UI. Set automatically on success — see finishTask. */
  collapsed: boolean;
  /** Lines discarded to stay under MAX_LINES, counted across every trim. */
  droppedLines: number;
}

/** Output is capped so a runaway command cannot exhaust memory. */
const MAX_LINES = 5000;

let nextId = 1;
let tasks: Task[] = [];
const listeners = new Set<() => void>();

const emit = () => {
  // A new array each time: consumers compare snapshots by identity.
  tasks = [...tasks];
  listeners.forEach(fn => fn());
};

export function subscribeTasks(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getTasks(): Task[] {
  return tasks;
}

export function startTask(command: string): Task {
  const task: Task = {
    id: nextId++,
    command,
    status: 'running',
    lines: [],
    startedAt: Date.now(),
    collapsed: false,
    droppedLines: 0,
  };
  tasks = [...tasks, task];
  emit();
  return task;
}

export function appendTaskLine(id: number, line: OutputLine): void {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.lines.push(line);
  if (task.lines.length > MAX_LINES) {
    // `lines` holds only real output — the "N dropped" notice is rendered by the
    // panel from droppedLines. Keeping it out of the array matters: as a line it
    // would fall inside the retained window and be re-counted as dropped output
    // on the next trim, so the total could never exceed one trim's worth.
    const dropped = task.lines.length - MAX_LINES;
    task.droppedLines += dropped;
    task.lines = task.lines.slice(dropped);
  }
  emit();
}

export function finishTask(id: number, exitCode: number): void {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.status = exitCode === 0 ? 'done' : 'failed';
  task.exitCode = exitCode;
  task.endedAt = Date.now();
  // Success collapses itself — that output has served its purpose. A failure
  // stays open, because that is the one you need to read.
  task.collapsed = exitCode === 0;
  emit();
}

export function toggleTaskCollapsed(id: number): void {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.collapsed = !task.collapsed;
  emit();
}

export function dismissTask(id: number): void {
  tasks = tasks.filter(t => t.id !== id);
  emit();
}

export function clearFinishedTasks(): void {
  tasks = tasks.filter(t => t.status === 'running');
  emit();
}

/** Test seam. */
export function __resetTasks(): void {
  tasks = [];
  nextId = 1;
  listeners.clear();
}
