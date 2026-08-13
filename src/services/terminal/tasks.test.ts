import { describe, it, expect, beforeEach } from 'vitest';
import {
  startTask, appendTaskLine, finishTask, toggleTaskCollapsed, dismissTask,
  clearFinishedTasks, getTasks, subscribeTasks, __resetTasks,
} from './tasks';

beforeEach(() => __resetTasks());

describe('task store', () => {
  it('collects output against the right task', () => {
    const a = startTask('echo one');
    const b = startTask('echo two');
    appendTaskLine(a.id, { kind: 'out', text: 'from a' });
    appendTaskLine(b.id, { kind: 'out', text: 'from b' });

    const tasks = getTasks();
    expect(tasks.find(t => t.id === a.id)!.lines[0].text).toBe('from a');
    expect(tasks.find(t => t.id === b.id)!.lines[0].text).toBe('from b');
  });

  it('collapses a successful task but leaves a failure open', () => {
    // A failure is the one you actually need to read.
    const ok = startTask('true');
    finishTask(ok.id, 0);
    expect(getTasks().find(t => t.id === ok.id)!.collapsed).toBe(true);

    const bad = startTask('false');
    finishTask(bad.id, 1);
    const failed = getTasks().find(t => t.id === bad.id)!;
    expect(failed.collapsed).toBe(false);
    expect(failed.status).toBe('failed');
    expect(failed.exitCode).toBe(1);
  });

  it('caps output so a runaway command cannot exhaust memory', () => {
    const task = startTask('yes');
    for (let i = 0; i < 5200; i++) {
      appendTaskLine(task.id, { kind: 'out', text: `line ${i}` });
    }
    const capped = getTasks()[0];
    expect(capped.lines.length).toBe(5000);
    // The most recent output is what survives; the count of the rest is tracked
    // separately and rendered by the panel.
    expect(capped.lines[capped.lines.length - 1].text).toBe('line 5199');
    expect(capped.lines[0].text).toBe('line 200');
    expect(capped.droppedLines).toBe(200);
  });

  it('accumulates the dropped count across every trim', () => {
    const task = startTask('yes');
    for (let i = 0; i < 8000; i++) {
      appendTaskLine(task.id, { kind: 'out', text: `line ${i}` });
    }
    // 8000 emitted, 5000 retained. A per-trim count would report 1 here.
    expect(getTasks()[0].droppedLines).toBe(3000);
    expect(getTasks()[0].lines.length).toBe(5000);
  });

  it('notifies subscribers on change, with a fresh array each time', () => {
    let calls = 0;
    let last = getTasks();
    const unsubscribe = subscribeTasks(() => {
      calls++;
      // useSyncExternalStore compares by identity; a mutated array would not
      // re-render.
      expect(getTasks()).not.toBe(last);
      last = getTasks();
    });

    const task = startTask('echo hi');
    appendTaskLine(task.id, { kind: 'out', text: 'hi' });
    finishTask(task.id, 0);
    expect(calls).toBe(3);
    unsubscribe();
  });

  it('clear finished keeps running tasks', () => {
    const running = startTask('sleep 100');
    const done = startTask('true');
    finishTask(done.id, 0);

    clearFinishedTasks();
    expect(getTasks()).toHaveLength(1);
    expect(getTasks()[0].id).toBe(running.id);
  });

  it('dismiss removes one task, toggle flips its collapse', () => {
    const task = startTask('echo hi');
    toggleTaskCollapsed(task.id);
    expect(getTasks()[0].collapsed).toBe(true);

    dismissTask(task.id);
    expect(getTasks()).toHaveLength(0);
  });

  it('ignores writes to a task that no longer exists', () => {
    const task = startTask('echo hi');
    dismissTask(task.id);
    // A command finishing after the user dismissed its box must not throw.
    expect(() => appendTaskLine(task.id, { kind: 'out', text: 'late' })).not.toThrow();
    expect(() => finishTask(task.id, 0)).not.toThrow();
  });
});
