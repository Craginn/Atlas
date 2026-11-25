import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, RotateCw, AlertTriangle } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { Script, WorldState, KnowledgeBase } from '@/types';
import { dispatch } from '@/services/terminal/dispatch';
import { CommandContext, OutputLine } from '@/services/terminal/types';
import {
  isShellAvailable,
  openShellSession,
  runShellViaBridge,
  ShellMessage,
  ShellSession,
} from '@/services/terminal/shellClient';
import { startTask, appendTaskLine, finishTask } from '@/services/terminal/tasks';
import TaskPanel from './TaskPanel';

// The in-app terminal.
//
// A real shell session from the desktop host, rendered by xterm.js. Keystrokes go
// straight to the shell and its bytes come straight back, so ANSI colour,
// cursor movement and full-screen redraws all work — which is what lets an
// interactive CLI run in here at all.
//
// Atlas's own commands (`/run`, `/state`, …) are intercepted before the shell
// sees them, because they operate on React state the shell knows nothing about.

interface TerminalViewProps {
  scripts: Script[];
  setScripts: React.Dispatch<React.SetStateAction<Script[]>>;
  worldState: WorldState;
  setWorldState: (next: WorldState) => void;
  knowledgeBase: KnowledgeBase;
  setKnowledgeBase: (next: KnowledgeBase) => void;
  fileLinkingConfig: Record<string, { path: string; content: string }>;
  runSimulation: (input: string) => Promise<{ output: string; reasoning?: string }>;
  onOpenSettings: () => void;
}

/** Matches the app's palette so the terminal doesn't look bolted on. */
const THEME = {
  background: '#0a0a0c',
  foreground: '#d4d4d8',
  cursor: '#a78bfa',
  selectionBackground: '#3f3f46',
  black: '#18181b',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#fbbf24',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#e4e4e7',
  brightBlack: '#52525b',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fcd34d',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#fafafa',
};

const COLORS: Record<OutputLine['kind'], string> = {
  out: '\x1b[0m',
  err: '\x1b[31m',
  info: '\x1b[90m',
  input: '\x1b[35m',
};

type Status = 'connecting' | 'open' | 'closed' | 'unavailable';

const TerminalView: React.FC<TerminalViewProps> = ({
  scripts, setScripts, worldState, setWorldState, knowledgeBase, setKnowledgeBase,
  fileLinkingConfig, runSimulation, onOpenSettings,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionRef = useRef<ShellSession | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const [mode, setMode] = useState<'pty' | 'pipe' | null>(null);
  const [generation, setGeneration] = useState(0);

  // The line being typed, tracked only while an Atlas command is in progress —
  // see the keystroke handler for why the shell owns echo the rest of the time.
  const lineRef = useRef('');
  const atlasBusyRef = useRef(false);

  // Refs so commands read current state: a command may resolve after an await,
  // by which point a captured value would be stale.
  const latest = useRef({ scripts, worldState, knowledgeBase, fileLinkingConfig });
  latest.current = { scripts, worldState, knowledgeBase, fileLinkingConfig };

  const ctxRef = useRef<CommandContext>({} as CommandContext);
  ctxRef.current = {
    getScripts: () => latest.current.scripts,
    setScripts: next => setScripts(next),
    getWorldState: () => latest.current.worldState,
    setWorldState: next => setWorldState(next),
    getKnowledgeBase: () => latest.current.knowledgeBase,
    setKnowledgeBase: next => setKnowledgeBase(next),
    runSimulation,

    // Plain shell input goes to the interactive session, not here — this is only for
    // Atlas commands that shell out, which use the one-shot command bridge so
    // their output can be captured rather than painted onto the terminal.
    runShell: isShellAvailable() ? runShellViaBridge : undefined,

    // /task: output goes to the panel, terminal keeps one summary line.
    runTask: isShellAvailable()
      ? async (command: string) => {
          const task = startTask(command);
          const { exitCode } = await runShellViaBridge(command, line =>
            appendTaskLine(task.id, line),
          );
          finishTask(task.id, exitCode);
          return [
            {
              kind: exitCode === 0 ? ('info' as const) : ('err' as const),
              text: `task ${task.id} ${exitCode === 0 ? 'finished' : 'failed'} (exit ${exitCode}) — see the Tasks panel`,
            },
          ];
        }
      : undefined,
  };

  const writeLines = useCallback((term: Terminal, lines: OutputLine[]) => {
    for (const line of lines) {
      term.write(`${COLORS[line.kind]}${line.text.replace(/\n/g, '\r\n')}\x1b[0m\r\n`);
    }
  }, []);

  // ------------------------------------------------------------ terminal setup

  useEffect(() => {
    if (!hostRef.current) return;

    const term = new Terminal({
      fontSize: 12,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Code", "Liberation Mono", monospace',
      theme: THEME,
      cursorBlink: true,
      convertEol: false,
      scrollback: 5000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    if (!isShellAvailable()) {
      setStatus('unavailable');
      writeLines(term, [
        { kind: 'err', text: 'No shell available.' },
        { kind: 'info', text: 'Run Atlas as the desktop app (npm run dev / npm start) to get a shell,' },
        { kind: 'info', text: 'unless it was started with ATLAS_ENABLE_SHELL=0.' },
        { kind: 'info', text: '' },
        { kind: 'info', text: 'Atlas commands still work here — try /help.' },
      ]);
      term.write('\x1b[35m$\x1b[0m ');
    }

    // The shell needs to know the window size or full-screen programs draw at
    // the wrong dimensions.
    const onResize = () => {
      fit.fit();
      const session = sessionRef.current;
      if (session) {
        session.resize(term.cols, term.rows);
      }
    };
    window.addEventListener('resize', onResize);

    // The pane can change size without the window doing so (panels toggling).
    const observer = new ResizeObserver(onResize);
    observer.observe(hostRef.current);

    return () => {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      term.dispose();
      termRef.current = null;
    };
  }, [writeLines]);

  // ------------------------------------------------------------ shell session

  useEffect(() => {
    const term = termRef.current;
    if (!term || !isShellAvailable()) return;

    setStatus('connecting');
    let cancelled = false;
    let session: ShellSession | null = null;

    const onMessage = (msg: ShellMessage) => {
      if (msg.type === 'data') {
        term.write(msg.data);
      } else if (msg.type === 'ready') {
        setMode(msg.mode);
      } else if (msg.type === 'notice') {
        writeLines(term, [{ kind: 'info', text: msg.text }]);
      } else if (msg.type === 'exit') {
        writeLines(term, [{ kind: 'info', text: `\n[shell exited ${msg.exitCode}]` }]);
        sessionRef.current = null;
        setStatus('closed');
      }
    };

    openShellSession(term.cols, term.rows, onMessage).then(
      s => {
        if (cancelled) {
          s.close();
          return;
        }
        session = s;
        sessionRef.current = s;
        setStatus('open');
      },
      e => {
        writeLines(term, [{ kind: 'err', text: e instanceof Error ? e.message : String(e) }]);
        setStatus('closed');
      },
    );

    return () => {
      cancelled = true;
      session?.close();
      sessionRef.current = null;
    };
  }, [generation, writeLines]);

  // ------------------------------------------------------------ keystrokes

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    const runAtlasCommand = async (line: string) => {
      atlasBusyRef.current = true;
      term.write('\r\n');
      try {
        const result = await dispatch(line, ctxRef.current, {
          onLine: l => writeLines(term, [l]),
        });
        writeLines(term, result.lines);
      } catch (e) {
        writeLines(term, [
          { kind: 'err', text: e instanceof Error ? e.message : String(e) },
        ]);
      } finally {
        atlasBusyRef.current = false;
        const session = sessionRef.current;
        if (session) {
          // Nudge the shell to redraw its prompt, so the screen doesn't look
          // stuck after Atlas output.
          session.write('\n');
        } else {
          term.write('\x1b[35m$\x1b[0m ');
        }
      }
    };

    const disposable = term.onData(data => {
      if (atlasBusyRef.current) return;

      const session = sessionRef.current;
      const connected = session !== null;

      // Atlas commands are intercepted, so the line has to be tracked locally
      // to know what was typed. Everything else is forwarded raw and the shell
      // does its own echo, history and line editing — reimplementing those here
      // would fight the shell rather than help it.
      if (data === '\r') {
        const line = lineRef.current;
        lineRef.current = '';
        if (line.trim().startsWith('/') && !line.trim().slice(1).split(/\s/)[0].includes('/')) {
          if (connected) {
            // Clear what the shell echoed; Atlas is answering this one.
            session!.write('\x15');
          }
          void runAtlasCommand(line);
          return;
        }
      } else if (data === '\x7f') {
        lineRef.current = lineRef.current.slice(0, -1);
      } else if (data >= ' ') {
        lineRef.current += data;
      }

      if (connected) {
        session!.write(data);
        return;
      }

      // No shell: emulate just enough to make Atlas commands usable.
      if (data === '\r') {
        term.write('\r\n');
        const line = lineRef.current;
        lineRef.current = '';
        if (line.trim()) void runAtlasCommand(line);
        else term.write('\x1b[35m$\x1b[0m ');
      } else if (data === '\x7f') {
        term.write('\b \b');
      } else if (data >= ' ') {
        term.write(data);
      }
    });

    return () => disposable.dispose();
  }, [writeLines]);

  // ------------------------------------------------------------ render

  const statusLabel =
    status === 'open'
      ? mode === 'pipe'
        ? 'no pty'
        : 'connected'
      : status === 'connecting'
        ? 'connecting…'
        : status === 'unavailable'
          ? 'no shell'
          : 'disconnected';

  return (
    <div className="h-full flex flex-col bg-[#0a0a0c] text-zinc-300">
      <div className="h-10 shrink-0 flex items-center px-3 gap-2 border-b border-zinc-800/50">
        <TerminalIcon size={13} className="text-purple-400" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
          Terminal
        </span>
        <span className="ml-auto flex items-center gap-3 text-[10px] font-mono">
          {mode === 'pipe' && (
            <span
              className="flex items-center gap-1 text-amber-400/80"
              title="node-pty did not load, so interactive programs will not work"
            >
              <AlertTriangle size={11} /> no pty
            </span>
          )}
          <span
            className={
              status === 'open'
                ? 'text-emerald-400/80'
                : status === 'connecting'
                  ? 'text-zinc-500'
                  : 'text-amber-400/80'
            }
          >
            {statusLabel}
          </span>
          {(status === 'closed' || status === 'unavailable') && (
            <button
              onClick={() => setGeneration(g => g + 1)}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <RotateCw size={11} /> reconnect
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            settings
          </button>
        </span>
      </div>

      <TaskPanel />

      <div ref={hostRef} className="flex-1 min-h-0 p-2" />
    </div>
  );
};

export default TerminalView;
