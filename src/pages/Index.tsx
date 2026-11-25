import React, { useState, useCallback, useEffect, useMemo, useDeferredValue } from 'react';
import { WorldState, Script, SentinelReport, SimulationMode, KnowledgeBase, LastSimData, HistoryEntry } from '@/types';
import { INITIAL_WORLD_STATE, DEFAULT_SCRIPTS } from '@/constants';
import AILogicEditor from '@/components/atlas/AILogicEditor';
import Sentinel from '@/components/atlas/Sentinel';
import StateEditor from '@/components/atlas/StateEditor';
import SimulationEngine from '@/components/atlas/SimulationEngine';
import PlotEssentials from '@/components/atlas/PlotEssentials';
import SettingsView from '@/components/atlas/SettingsView';
import DocsView from '@/components/atlas/DocsView';
import StoryCardsView from '@/components/atlas/StoryCardsView';
import TerminalView from '@/components/atlas/TerminalView';
import BlockCanvas from '@/components/atlas/BlockCanvas';
import ContextLab from '@/components/atlas/ContextLab';
import ViewErrorBoundary from '@/components/atlas/ViewErrorBoundary';
import { APP_VERSION } from '@/services/appVersion';
import { useGitHubSync } from '@/hooks/use-github-sync';
import { GitBranch } from 'lucide-react';

const VIEW_NAMES: Record<string, string> = {
  simulation: 'Simulation Engine', state: 'State Editor', logic: 'JS Code Editor', blocks: 'Block Canvas',
  sentinel: 'Sentinel Debugger', plot: 'Plot Essentials', docs: 'AID Docs', cards: 'Story Cards',
  terminal: 'Terminal', lab: 'Context Lab',
};
import {
  Code2, ShieldCheck, Cpu, Database, PanelLeft,
  Terminal, Book, Settings, FlaskConical, FileText, Layers,
  Menu, X, Blocks, Microscope
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { refreshShellStatus } from '@/services/terminal/shellClient';
import { ScriptingService, mergeScriptStoryCards, PlayerActionType } from '@/services/scriptingService';
import { problemsFromChecks, problemsFromRun } from '@/services/errors/problems';
import type { GoTo } from '@/components/atlas/ProblemCard';
import type { MarkedError } from '@/components/atlas/CodeBuffer';
import { readHandle } from '@/services/fileLinkService';
import { EMPTY_FILE_LINKING_CONFIG, EMPTY_LINKED_FILES, LinkedFiles } from '@/utils/fileLinking';

const INITIAL_KNOWLEDGE_BASE: KnowledgeBase = {
  aiInstructions: '',
  plotEssentials: '',
  storyCards: [],
  storySummary: '',
  memoryBank: '',
  recentHistory: '',
  authorsNote: '',
};

type ViewType = 'state' | 'logic' | 'blocks' | 'sentinel' | 'simulation' | 'plot' | 'docs' | 'cards' | 'terminal' | 'lab';

/**
 * Which file-linking slot feeds which script slot. Keyed by script *name*
 * because that is what identifies a hook to the engine (see HOOK_ORDER in
 * scriptingService); ids are just storage keys.
 */
const SCRIPT_NAME_TO_SLOT: Record<string, 'library' | 'input' | 'context' | 'output'> = {
  'Library': 'library',
  'Input Modifier': 'input',
  'Context Modifier': 'context',
  'Output Modifier': 'output',
};

const ProjectExplorer = ({ view, setView, onOpenSettings, onClose, github, onOpenGitHub }: {
  view: ViewType;
  setView: (v: ViewType) => void;
  onOpenSettings: () => void;
  /** Supplied only on mobile, where the explorer is a dismissable drawer. */
  onClose?: () => void;
  /** The user's linked scripts repo, if any, and how many changes are waiting to push. */
  github: { repo: string | null; toPush: number };
  onOpenGitHub: () => void;
}) => {
  const menuItems = [
    { id: 'simulation' as const, icon: Terminal, label: 'Simulation Engine' },
    { id: 'state' as const, icon: Database, label: 'State Editor' },
    { id: 'logic' as const, icon: Code2, label: 'JS Code Editor' },
    { id: 'blocks' as const, icon: Blocks, label: 'Block Canvas' },
    // Terminal is hidden from the menu. The view and its Electron shell bridge
    // (electron/shell.mjs) are intact; restoring it means re-adding the line
    // below plus the `SquareTerminal` icon to the lucide-react import.
    // { id: 'terminal' as const, icon: SquareTerminal, label: 'Terminal' },
    { id: 'plot' as const, icon: Book, label: 'Plot Essentials' },
    { id: 'cards' as const, icon: Layers, label: 'Story Cards' },
    { id: 'docs' as const, icon: FileText, label: 'AID Docs' },
    { id: 'lab' as const, icon: Microscope, label: 'Context Lab' },
  ];

  return (
    <div className="bg-[#0c0c0f] border-r border-zinc-800/50 flex flex-col h-full">
      <div className="h-14 flex items-center px-4 space-x-2 border-b border-zinc-800/50 shrink-0">
        <div className="p-2 bg-purple-600/20 rounded-lg">
          <FlaskConical className="text-purple-400" size={16} />
        </div>
        <div>
          <h1 className="font-bold tracking-tight text-sm italic text-zinc-200">Aid Atlas</h1>
          <div className="text-[11px] text-zinc-500 -mt-0.5">AI Dungeon script lab</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto p-2 -mr-2 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="flex-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center justify-start space-x-3 p-3 md:p-2 rounded-md text-sm md:text-xs font-semibold transition-colors ${
                view === item.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
              }`}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-zinc-800/50">
          <button
            onClick={() => setView('sentinel')}
            className={`w-full flex items-center justify-start space-x-3 p-3 md:p-2 rounded-md text-sm md:text-xs font-semibold transition-colors ${
              view === 'sentinel' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'
            }`}
          >
            <ShieldCheck size={14} className="text-red-500" />
            <span>Sentinel Debugger</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-start space-x-3 p-3 md:p-2 rounded-md text-sm md:text-xs font-semibold text-zinc-400 hover:bg-zinc-900/50 hover:text-white transition-colors"
          >
            <Settings size={14} />
            <span>Settings</span>
          </button>
        </div>
      </div>
      <div className="p-2 border-t border-zinc-800/50 shrink-0">
        <button
          onClick={onOpenGitHub}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 transition-colors"
          title={github.repo ? 'Pull and push your scripts' : 'Keep your scripts in your own GitHub repository'}
        >
          <GitBranch size={14} className="shrink-0" />
          <span className="truncate">{github.repo ?? 'Link your scripts to GitHub'}</span>
          {github.toPush > 0 && (
            <span className="ml-auto shrink-0 px-1.5 rounded bg-sky-500/15 text-sky-300 text-[11px]" title="Changed here, not pushed yet">
              {github.toPush} to push
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

const StatusBar = ({ panels, setPanels }: {
  panels: { left: boolean };
  setPanels: React.Dispatch<React.SetStateAction<{ left: boolean }>>;
}) => {
  return (
  <div className="safe-bottom bg-[#0c0c0f] border-t border-zinc-800/50 h-6 box-content px-4 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
    <div className="flex items-center space-x-4">
      {/* The app is offline-only: scripts run locally and the AI reply is the
          user's stand-in from the Director's AI Call box. */}
      <div className="flex items-center text-zinc-400" title="Offline engine: scripts run locally and the AI reply is your stand-in text">
        <Cpu size={11} className="mr-1.5" />
        <span>Offline — scripts run on this computer</span>
      </div>
    </div>
    <div className="flex items-center space-x-4">
      {/* The docked-panel toggle is desktop-only; on mobile the explorer is a drawer. */}
      <button
        onClick={() => setPanels(p => ({ ...p, left: !p.left }))}
        aria-label="Toggle explorer panel"
        className={`hidden md:block hover:text-white transition-colors ${panels.left ? 'text-zinc-400' : 'text-zinc-700'}`}
      >
        <PanelLeft size={12} />
      </button>
      <div className="hidden md:block w-px h-3 bg-zinc-700" />
      <span className="text-zinc-600">v{APP_VERSION}</span>
    </div>
  </div>
  );
};

const Index: React.FC = () => {
  const [worldState, setWorldState] = useState<WorldState>(INITIAL_WORLD_STATE);
  // AID's `history`, held beside the world state rather than inside it — it is
  // engine-owned, and keeping it in `state` meant every turn's text accumulated
  // in the object scripts persist and the State Editor renders.
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [previousWorldState, setPreviousWorldState] = useState<WorldState | null>(null);
  const [scripts, setScripts] = useState<Script[]>(DEFAULT_SCRIPTS);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(INITIAL_KNOWLEDGE_BASE);
  const [view, setView] = useState<ViewType>('simulation');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // The user's own scripts repo: pull/push the four script files.
  const github = useGitHubSync(scripts, setScripts);
  const githubSummary = useMemo(() => ({
    repo: github.linked ? `${github.config.owner}/${github.config.repo}` : null,
    toPush: github.localChanges.length,
  }), [github.linked, github.config.owner, github.config.repo, github.localChanges.length]);
  const openSettings = useCallback((tab: 'linking' | 'github' | 'layout' | 'debug') => {
    setSettingsTab(tab);
    setIsSettingsOpen(true);
  }, []);
  // The only simulation mode: scripts run locally and the AI reply is the
  // user's stand-in text. There is no remote generation.
  const engine: SimulationMode = 'local';
  const [lastSimData, setLastSimData] = useState<LastSimData | null>(null);
  const [panels, setPanels] = useState({ left: true });
  const [settingsTab, setSettingsTab] = useState<'linking' | 'github' | 'layout' | 'debug'>('linking');
  // Ask the dev server once whether an interactive shell bridge is reachable, so
  // the terminal's /sh knows up front whether it can run anything here.
  useEffect(() => { void refreshShellStatus(); }, []);
  const isMobile = useIsMobile();
  // On mobile the explorer becomes an overlay drawer rather than a docked column.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sentinelReport, setSentinelReport] = useState<SentinelReport | null>(null);

  const [activeScriptId, setActiveScriptId] = useState<string>('');
  // The Director's Input box. Lifted out of SimulationEngine so the Block Canvas
  // can bind the same text to `text` in a scratch run.
  const [simInput, setSimInput] = useState<string>('');
  const [fileLinkingConfig, setFileLinkingConfig] = useState(EMPTY_FILE_LINKING_CONFIG);
  const [linkedFiles, setLinkedFiles] = useState<LinkedFiles>(EMPTY_LINKED_FILES);
  // Live file handles (File System Access API) so external edits can be re-read.
  const [fileHandles, setFileHandles] = useState<Record<string, FileSystemFileHandle | null>>({
    library: null, input: null, context: null, output: null,
  });

  useEffect(() => {
    if (activeScriptId && !scripts.some(s => s.id === activeScriptId)) {
      setActiveScriptId(scripts.length > 0 ? scripts[0].id : '');
    } else if (!activeScriptId && scripts.length > 0) {
      setActiveScriptId(scripts[0].id);
    }
  }, [scripts]);

  // Load linked files into the script slots they name.
  //
  // This used to write the library file into whatever script was *selected*, and
  // it re-ran on activeScriptId — so simply clicking the Input Modifier tab
  // replaced that hook's code with the library's. Now each slot only ever
  // targets its own script, and selection is irrelevant.
  useEffect(() => {
    setScripts(prev => prev.map(script => {
      const slot = SCRIPT_NAME_TO_SLOT[script.name];
      if (!slot) return script;
      const linked = fileLinkingConfig[slot];
      if (!linked?.content || linked.path === 'Link File') return script;
      // Compare before writing so re-running this never clobbers edits the user
      // made in the editor with identical content, and never loops.
      return script.code === linked.content ? script : { ...script, code: linked.content };
    }));
  }, [fileLinkingConfig]);

  const handleSaveSettings = (
    newPaths: any,
    newContents: any,
    newFiles: Record<string, File | null>,
    newHandles?: Record<string, FileSystemFileHandle | null>,
  ) => {
    setFileLinkingConfig({
      library: { path: newPaths.library, content: newContents.library },
      input: { path: newPaths.input, content: newContents.input },
      context: { path: newPaths.context, content: newContents.context },
      output: { path: newPaths.output, content: newContents.output },
    });
    setLinkedFiles(prev => ({
      library: newFiles.library ?? prev.library,
      input: newFiles.input ?? prev.input,
      context: newFiles.context ?? prev.context,
      output: newFiles.output ?? prev.output,
    }));
    if (newHandles) {
      setFileHandles(prev => ({
        library: newHandles.library ?? prev.library,
        input: newHandles.input ?? prev.input,
        context: newHandles.context ?? prev.context,
        output: newHandles.output ?? prev.output,
      }));
    }
  };

  const reReadLinkedFiles = useCallback(async () => {
    // Prefer a live handle (reads CURRENT on-disk contents, so external VS Code
    // edits are picked up). Fall back to the stale File blob when no handle
    // exists (non-Chromium browsers / <input type=file> path).
    const readSlot = async (slot: 'library' | 'input' | 'context' | 'output'): Promise<string | null> => {
      const handle = fileHandles[slot];
      if (handle) {
        try {
          return await readHandle(handle);
        } catch {
          return null;
        }
      }
      const file = linkedFiles[slot];
      if (!file) return null;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      });
    };

    const [libContent, inContent, ctxContent, outContent] = await Promise.all([
      readSlot('library'),
      readSlot('input'),
      readSlot('context'),
      readSlot('output'),
    ]);

    const updated = { ...fileLinkingConfig };
    if (libContent !== null) updated.library = { ...updated.library, content: libContent };
    if (inContent !== null) updated.input = { ...updated.input, content: inContent };
    if (ctxContent !== null) updated.context = { ...updated.context, content: ctxContent };
    if (outContent !== null) updated.output = { ...updated.output, content: outContent };

    setFileLinkingConfig(updated);
    return updated;
  }, [linkedFiles, fileHandles, fileLinkingConfig]);

  /**
   * Start over: clear the story history, the saved state and the last run, as
   * if the adventure had just been created. Scripts, Plot Essentials and story
   * cards are kept.
   */
  const startNewAdventure = useCallback(() => {
    if (!window.confirm('Start a new adventure? This clears the story history and the saved state (scripts, Plot Essentials and story cards are kept).')) return;
    setHistory([]);
    setWorldState(INITIAL_WORLD_STATE);
    setPreviousWorldState(null);
    setLastSimData(null);
  }, []);

  const handleSetWorldState = useCallback((newState: WorldState) => {
    setWorldState(ws => {
      // Same reference means nothing changed; only compare contents otherwise.
      if (ws !== newState && JSON.stringify(ws) !== JSON.stringify(newState)) {
        setPreviousWorldState(ws);
      }
      return newState;
    });
  }, []);

  // Field-level Knowledge Base updater used by the Plot Essentials panel.
  const setKnowledgeBaseField = useCallback((field: keyof KnowledgeBase, value: string) => {
    setKnowledgeBase(kb => ({ ...kb, [field]: value }));
  }, []);

  /**
   * `/run` in the terminal. Deliberately not handleRunSimulation: that drives
   * the Director's panels (sentinel report, trace, AI-call box) and returns
   * nothing. The terminal only needs the resulting text, and running it should
   * not disturb the simulation view's state.
   */
  const runSimulationForTerminal = useCallback(
    async (input: string) => {
      const result = await ScriptingService.simulateStep(
        input, worldState, scripts, engine, knowledgeBase, '', 'do', history,
      );
      if (result.newHistory) setHistory(result.newHistory);
      // State changes are real and must persist, or the next /run starts from
      // a world the previous one already moved on from. Route through
      // handleSetWorldState so previousWorldState tracks this run too.
      if (result.newState) handleSetWorldState(result.newState);
      // Keep the Delta view current: without this, a terminal run advances the
      // world state while the State Deltas tab keeps rendering the trace of an
      // older Director run — changes from these turns silently never appear.
      if (result.stateTrace) {
        setLastSimData(prev => prev
          ? { ...prev, stateTrace: result.stateTrace, newState: result.newState ?? prev.newState, textTransforms: result.textTransforms }
          : prev);
      }
      return { output: result.output ?? result.narration ?? '', reasoning: result.reasoning };
    },
    [worldState, history, scripts, engine, knowledgeBase, handleSetWorldState],
  );

  const handleRunSimulation = async (
    input: string, context?: string, output?: string,
    actionType: 'do' | 'say' | 'story' | 'continue' = 'do',
  ) => {
    if (lastSimData?.isProcessing) return;

    // Continue carries no player action: the engine generates on from history.
    // simulateStep only frames Do/Say/Story, so map Continue to an empty action
    // it treats as a no-new-text turn (a Continue never records a player entry).
    const isContinue = actionType === 'continue';
    const runInput = isContinue ? '' : input;
    const playerType: PlayerActionType = isContinue ? 'do' : actionType;

    // Re-read linked files before running
    const updatedConfig = await reReadLinkedFiles();

    // Push each linked file into the script slot it names.
    //
    // This previously wrote the *library* file's contents into whichever script
    // happened to be selected (activeScriptId), so linking a library while the
    // Input Modifier was open silently replaced that hook's code with the
    // library's. The other three slots were never applied to any script at all.
    setScripts(prev => prev.map(script => {
      const slot = SCRIPT_NAME_TO_SLOT[script.name];
      if (!slot) return script;
      const linked = updatedConfig[slot];
      // 'Link File' is the placeholder shown when nothing is linked; an empty
      // file is also ignored, since blanking a hook is never what linking meant.
      if (!linked?.content || linked.path === 'Link File') return script;
      return script.code === linked.content ? script : { ...script, code: linked.content };
    }));

    // Preserve the user-configured Knowledge Base (esp. AI Instructions, which
    // scripts must never manipulate — AID-faithful). The player action is passed
    // as `input` to simulateStep, NOT written into aiInstructions. Only update
    // the Memory Bank from the optional context box when it actually has content.
    const newKB: KnowledgeBase = {
      ...knowledgeBase,
      memoryBank: context && context.trim() ? context : knowledgeBase.memoryBank,
    };
    setKnowledgeBase(newKB);

    setLastSimData({
      input: runInput, context, output, actionType,
      previousState: worldState, newState: null, triggeredScripts: [],
      reasoning: '', isProcessing: true, narration: '',
    });

    try {
      // `output` is the Director's AI Call box: the stand-in for what the model would
      // have returned, which the Output hook then receives.
      const result = await ScriptingService.simulateStep(runInput, worldState, scripts, engine, newKB, output ?? '', playerType, history);
      if (result.newHistory) setHistory(result.newHistory);
      const triggered = scripts.filter(s => result.triggeredScriptIds?.includes(s.id));

      let trace = null;
      if (result.reasoning) {
        try { trace = JSON.parse(result.reasoning); } catch { /* reasoning isn't JSON; leave trace null */ }
      }

      setSentinelReport(prev => ({
        ...(prev as SentinelReport),
        executionTrace: trace,
        executedCode: result.executedCode,
        status: result.executionError ? 'error' : (result.scriptErrors?.length ? 'warning' : 'healthy'),
        errors: prev?.errors || [],
        suggestions: prev?.suggestions || [],
        message: result.executionError
          ? `${result.executionError.hook} failed at line ${result.executionError.line}: ${result.executionError.message}`
          : result.scriptErrors?.length
          ? `${result.scriptErrors.length} caught error(s): ${result.scriptErrors
              .map(e => `${e.hook} line ${e.line} — ${e.message}`)
              .join('; ')}`
          : `Simulation finished with ${triggered.length} scripts triggered.`,
      }));

      setLastSimData(prevData => ({
        ...(prevData as LastSimData),
        newState: result.newState ?? worldState,
        reasoning: result.reasoning,
        narration: result.output ?? '',
        // The Director's read-only Output box renders `output`. Before the run it
        // was seeded with the AI Call box's text, so leaving it unset here meant
        // the box echoed the stand-in reply back and a script that seized the
        // Output (state.overwrite/state.output — e.g. a character-creation
        // question) was never shown to the player at all.
        output: result.output ?? result.narration ?? '',
        triggeredScripts: triggered,
        isProcessing: false,
        executedCode: result.executedCode,
        stateTrace: result.stateTrace,
        aiCall: result.aiCall,
        executionError: result.executionError ?? null,
        scriptErrors: result.scriptErrors ?? [],
        stateMessage: result.stateMessage ?? '',
        stateMessageAuthor: result.stateMessageAuthor,
        textTransforms: result.textTransforms,
      }));

      console.log('[Index.tsx] Simulation result received:', {
        hasNewState: !!result.newState,
        newState: result.newState,
        triggeredScripts: triggered.length,
      });
      
      if (result.newState) {
        console.log('[Index.tsx] Calling handleSetWorldState with:', JSON.stringify(result.newState));
        handleSetWorldState(result.newState);
        // Surface cards the scripts created. addStoryCard writes into
        // worldState.storyCards, which nothing was reading back — so a card an
        // engine built at runtime existed in state but never appeared in the
        // Story Cards view.
        //
        // Likewise, a script feeds the plot components through `state.memory`:
        // `state.memory.context` is the Plot Essentials block and
        // `state.memory.authorsNote` the Author's Note (matching the scriptRefs in
        // PlotEssentials). These were written into state but never read back, so a
        // script that rewrote the front memory or the author's note left the plot
        // components showing the stale, hand-typed text. Only adopt a field the
        // script actually wrote (a string) so untouched memory never blanks what
        // the user entered by hand.
        setKnowledgeBase(kb => {
          const merged = mergeScriptStoryCards(kb.storyCards ?? [], result.newState?.storyCards, result.changedStoryCardIds);
          const memory = result.newState?.memory;
          const nextPlot = typeof memory?.context === 'string' ? memory.context : kb.plotEssentials;
          const nextNote = typeof memory?.authorsNote === 'string' ? memory.authorsNote : kb.authorsNote;
          const cards = merged === (kb.storyCards ?? []) ? kb.storyCards : merged;
          if (cards === kb.storyCards && nextPlot === kb.plotEssentials && nextNote === kb.authorsNote) {
            return kb;
          }
          return { ...kb, storyCards: cards, plotEssentials: nextPlot, authorsNote: nextNote };
        });
      } else {
        console.log('[Index.tsx] No newState in result, state not updated');
      }
    } catch (err) {
      console.error("Simulation failed:", err);
      setLastSimData(null);
    }
  };

  // Run the offline AID-aware validator across all active scripts and surface
  // the findings in the Sentinel report.
  // ── Problems: one list behind every error surface ────────────────────────
  // Run problems come from the last run (structured, already located by the
  // worker); check problems from the static checker. Both are explained and
  // carry script + line + column, so every panel offers the same "go to line".
  const runProblems = useMemo(() => {
    // The code each script had when it ran — a problem in a script edited since
    // is marked stale instead of pointing at a line that may have moved.
    const executed = sentinelReport?.executedCode ?? {};
    const ranCode = Object.fromEntries(
      scripts.filter(s => executed[s.name] !== undefined).map(s => [s.id, executed[s.name]]),
    );
    return problemsFromRun(lastSimData as LastSimData | undefined, scripts, ranCode);
  }, [lastSimData, scripts, sentinelReport?.executedCode]);

  // The static check parses every script, so it only runs while the debugger is
  // open, and lags typing (deferred) rather than blocking it.
  const deferredScripts = useDeferredValue(scripts);
  const checkProblems = useMemo(
    () => (view === 'sentinel' ? problemsFromChecks(deferredScripts) : []),
    [view, deferredScripts],
  );

  /** Last run's errors, marked in the editor — only while the script is unchanged. */
  const runtimeErrorsByScriptId = useMemo(() => {
    const map: Record<string, MarkedError[]> = {};
    for (const p of runProblems) {
      if (!p.scriptId || p.stale || p.line < 1) continue;
      (map[p.scriptId] ??= []).push({ line: p.line, column: p.column, message: p.message, title: p.explanation.title });
    }
    return map;
  }, [runProblems]);

  // ── Go to line ────────────────────────────────────────────────────────────
  const [jumpRequest, setJumpRequest] = useState<{ scriptId: string; line: number; column?: number; nonce: number } | null>(null);
  const goToLine = useCallback<GoTo>(({ script, line, column }) => {
    const target = scripts.find(s => s.name === script) ?? scripts.find(s => s.id === script);
    if (!target) return;
    setActiveScriptId(target.id);
    setView('logic');
    setJumpRequest({ scriptId: target.id, line, column, nonce: Date.now() });
  }, [scripts]);

  const renderView = () => {
    switch (view) {
      case 'simulation':
        return (
          <SimulationEngine
            turn={history.reduce((n, e) => Math.max(n, e.turn ?? 0), 0)}
            onNewAdventure={startNewAdventure}
            onExecute={handleRunSimulation}
            isProcessing={lastSimData?.isProcessing ?? false}
            lastResult={lastSimData}
            report={sentinelReport}
            problems={runProblems}
            onGoTo={goToLine}
            input={simInput}
            setInput={setSimInput}
          />
        );
      case 'state':
        return <StateEditor worldState={worldState} setWorldState={handleSetWorldState} previousWorldState={previousWorldState} stateTrace={lastSimData?.stateTrace} hasError={!!lastSimData?.executionError} history={history} textTransforms={lastSimData?.textTransforms} />;
      case 'logic':
        return <AILogicEditor scripts={scripts} setScripts={setScripts} activeScriptId={activeScriptId} setActiveScriptId={setActiveScriptId} runtimeErrorsByScriptId={runtimeErrorsByScriptId} jumpRequest={jumpRequest} sync={github} onOpenGitHub={() => openSettings('github')} />;
      case 'blocks':
        // Same `scripts` state as the JS Code Editor — the canvas parses that
        // code into blocks and writes generated code back, so the two views are
        // two representations of one script, not separate copies.
        return (
          <BlockCanvas
            scripts={scripts}
            setScripts={setScripts}
            activeScriptId={activeScriptId}
            setActiveScriptId={setActiveScriptId}
            simInput={simInput}
            worldState={worldState}
            knowledgeBase={knowledgeBase}
            onApplyStoryCards={cards => setKnowledgeBase(kb => ({ ...kb, storyCards: cards }))}
            problems={runProblems}
            onGoTo={goToLine}
          />
        );
      case 'sentinel':
        return <Sentinel runProblems={runProblems} checkProblems={checkProblems} onGoTo={goToLine} hasRun={Boolean(lastSimData)} />;
      case 'plot':
        return <PlotEssentials knowledgeBase={knowledgeBase} onChange={setKnowledgeBaseField} />;
      case 'cards':
        return (
          <StoryCardsView
            cards={knowledgeBase.storyCards}
            setCards={(cards) => setKnowledgeBase(kb => ({ ...kb, storyCards: cards }))}
          />
        );
      case 'terminal':
        return (
          <TerminalView
            scripts={scripts}
            setScripts={setScripts}
            worldState={worldState}
            setWorldState={setWorldState}
            knowledgeBase={knowledgeBase}
            setKnowledgeBase={setKnowledgeBase}
            fileLinkingConfig={fileLinkingConfig}
            runSimulation={runSimulationForTerminal}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        );
      case 'docs':
        return <DocsView />;
      case 'lab':
        return <ContextLab />;
      default:
        return null;
    }
  };

  // Picking a destination should dismiss the mobile drawer; on desktop the
  // explorer stays docked and this is just setView.
  const selectView = (v: ViewType) => {
    setView(v);
    setMobileNavOpen(false);
  };

  return (
    // 100dvh rather than 100vh: mobile browsers size 100vh to the viewport with
    // the URL bar hidden, so the status bar would sit below the fold until you
    // scrolled.
    <div className="h-[100dvh] bg-black text-zinc-200 font-sans flex flex-col overflow-hidden">
      {isMobile && (
        <div className="h-12 bg-[#0c0c0f] border-b border-zinc-800/50 flex items-center px-3 gap-2 shrink-0">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <FlaskConical className="text-purple-400 shrink-0" size={14} />
          <span className="font-bold italic text-sm text-zinc-200">Aid Atlas</span>
          <span className="ml-auto text-xs text-zinc-400 truncate">{VIEW_NAMES[view] ?? view}</span>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden relative">
        {!isMobile && panels.left && (
          <div className="w-64 shrink-0">
            <ProjectExplorer view={view} setView={selectView} onOpenSettings={() => openSettings('linking')} github={githubSummary} onOpenGitHub={() => openSettings('github')} />
          </div>
        )}
        {isMobile && mobileNavOpen && (
          <>
            <div
              className="absolute inset-0 z-40 bg-black/60"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 z-50 w-64 max-w-[80%] shadow-2xl">
              <ProjectExplorer
                view={view}
                setView={selectView}
                onOpenSettings={() => { openSettings('linking'); setMobileNavOpen(false); }}
                onClose={() => setMobileNavOpen(false)}
                github={githubSummary}
                onOpenGitHub={() => { openSettings('github'); setMobileNavOpen(false); }}
              />
            </div>
          </>
        )}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 min-w-0">
          <div className="flex-1 overflow-hidden">
            {/* key: switching views also clears a crashed view. */}
            <ViewErrorBoundary key={view} viewName={VIEW_NAMES[view] ?? view}>
              {renderView()}
            </ViewErrorBoundary>
          </div>
        </div>
      </div>
      <StatusBar panels={panels} setPanels={setPanels} />
      <SettingsView
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
        fileLinkingConfig={fileLinkingConfig} onSave={handleSaveSettings}
        onReloadFromDisk={reReadLinkedFiles}
        scripts={scripts} setScripts={setScripts}
        sync={github}
        initialTab={settingsTab}
      />
    </div>
  );
};

export default Index;
