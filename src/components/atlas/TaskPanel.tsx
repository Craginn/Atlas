import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { ChevronDown, ChevronRight, Loader2, Check, X, Trash2 } from 'lucide-react';
import {
  Task, getTasks, subscribeTasks, toggleTaskCollapsed, dismissTask, clearFinishedTasks,
} from '@/services/terminal/tasks';
import { OutputLine } from '@/services/terminal/types';

// The bounded output box for `/task`.
//
// Sits above the terminal and scrolls independently, so an installer's few
// hundred lines never push the terminal's own history off screen.

const LINE_STYLES: Record<OutputLine['kind'], string> = {
  out: 'text-zinc-300',
  err: 'text-red-400',
  info: 'text-zinc-500',
  input: 'text-purple-300',
};

const elapsed = (task: Task) => {
  const ms = (task.endedAt ?? Date.now()) - task.startedAt;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
};

const TaskRow: React.FC<{ task: Task }> = ({ task }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  // Follow the tail while running, but stop fighting the user the moment they
  // scroll up to read something.
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [task.lines.length]);

  const StatusIcon =
    task.status === 'running' ? Loader2 : task.status === 'done' ? Check : X;
  const statusColor =
    task.status === 'running'
      ? 'text-zinc-400'
      : task.status === 'done'
        ? 'text-emerald-400'
        : 'text-red-400';

  return (
    <div className="border border-zinc-800 rounded-md overflow-hidden bg-[#0c0c0f]">
      <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900/60 border-b border-zinc-800">
        <button
          onClick={() => toggleTaskCollapsed(task.id)}
          className="text-zinc-500 hover:text-white transition-colors shrink-0"
          aria-label={task.collapsed ? 'Expand task output' : 'Collapse task output'}
        >
          {task.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        <StatusIcon
          size={12}
          className={`shrink-0 ${statusColor} ${task.status === 'running' ? 'animate-spin' : ''}`}
        />
        <span
          className="font-mono text-[11px] text-zinc-300 truncate flex-1 min-w-0"
          title={task.command}
        >
          {task.command}
        </span>
        <span className="text-[10px] font-mono text-zinc-600 shrink-0 tabular-nums">
          {task.lines.length} lines · {elapsed(task)}
          {task.status === 'failed' && ` · exit ${task.exitCode}`}
        </span>
        <button
          onClick={() => dismissTask(task.id)}
          className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
          aria-label="Dismiss task"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {!task.collapsed && (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          // Fixed height is the whole point: the box cannot grow to swallow the
          // terminal below it, however much the command prints.
          className="max-h-48 overflow-y-auto custom-scrollbar p-2 font-mono text-[11px] leading-relaxed"
        >
          {task.droppedLines > 0 && (
            <div className="text-zinc-500">
              … {task.droppedLines.toLocaleString()} earlier line(s) dropped
            </div>
          )}
          {task.lines.length === 0 ? (
            <div className="text-zinc-600">waiting for output…</div>
          ) : (
            task.lines.map((line, i) => (
              <div key={i} className={`whitespace-pre-wrap break-words ${LINE_STYLES[line.kind]}`}>
                {line.text || ' '}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const TaskPanel: React.FC = () => {
  const tasks = useSyncExternalStore(subscribeTasks, getTasks, getTasks);
  if (tasks.length === 0) return null;

  const finished = tasks.filter(t => t.status !== 'running').length;

  return (
    <div className="shrink-0 border-b border-zinc-800/50 max-h-[45%] overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 px-3 py-1 sticky top-0 bg-[#0a0a0c] z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Tasks
        </span>
        {finished > 0 && (
          <button
            onClick={clearFinishedTasks}
            className="ml-auto text-[10px] font-mono text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            clear finished
          </button>
        )}
      </div>
      <div className="px-2 pb-2 space-y-1.5">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default TaskPanel;
