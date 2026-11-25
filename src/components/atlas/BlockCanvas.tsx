import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Blocks, Plus, Search, ZoomIn, ZoomOut, Maximize2, AlertTriangle, Code2, X,
  Play, Terminal, Eraser, ChevronUp, ChevronDown, Zap, Lightbulb, List,
} from 'lucide-react';
import { KnowledgeBase, Script, StoryCard, WorldState } from '@/types';
import { BlockNode, BlockProgram } from '@/services/blocks/types';
import { parseCode } from '@/services/blocks/parse';
import { generateCode } from '@/services/blocks/generate';
import { PALETTE, PALETTE_GROUPS, PaletteEntry } from '@/services/blocks/palette';
import {
  runBlocks, runScriptAsHook, findBlock, toKnowledgeBaseCards, BlockRunResult, HookRunResult,
} from '@/services/blocks/runBlocks';
import { adviseScript, type Suggestion } from '@/services/blocks/guide';
import { ancestorIds, blockAtLine, rootOf } from '@/services/blocks/locate';
import { problemsFromRun, type Problem } from '@/services/errors/problems';
import type { CaughtInWorker } from '@/services/offlineSimulationService';
import BlockNodeView from './BlockNodeView';
import BlockOutline from './BlockOutline';
import { RunConsole, SuggestionsPanel } from './BlockAssist';
import type { GoTo } from './ProblemCard';
import { useLayoutMode } from '@/hooks/use-layout-mode';

// The visual scripting canvas.
//
// Code order vs. canvas position: JavaScript is linear but a canvas is 2-D, so
// something has to break the tie. Vertical position wins — a block higher on the
// canvas runs earlier. That keeps code generation deterministic and matches how
// people already read a script.

interface BlockCanvasProps {
  scripts: Script[];
  setScripts: (scripts: Script[]) => void;
  activeScriptId: string;
  setActiveScriptId: (id: string) => void;
  /** The Director's Input box — scratch runs bind it to `text`. */
  simInput: string;
  /** Read to populate `state`/`storyCards`; scratch runs never write it back. */
  worldState: WorldState;
  /** The real Story Card deck, seeded into test runs. */
  knowledgeBase: KnowledgeBase;
  /**
   * Commit a scratch run's story card changes. Only ever called from the
   * console's explicit Apply button — running never persists anything.
   */
  onApplyStoryCards: (cards: StoryCard[]) => void;
  /** The last Director run's problems — those in this script are marked on their blocks. */
  problems?: Problem[];
  /** Open a script line in the JS Code Editor (for problems outside this script). */
  onGoTo?: GoTo;
}

/** Above this many top-level blocks, start with an empty canvas and let the outline open blocks. */
const FOCUS_ABOVE = 25;

/** Caught errors from a test run, in the pipeline's shape so problemsFromRun can explain them. */
const caughtAsScriptErrors = (hook: string, caught: CaughtInWorker[]) =>
  caught.map(c => ({
    hook, scriptId: '', script: c.script, line: c.line ? String(c.line) : 'unknown',
    column: c.column ?? undefined, sourceLine: c.sourceLine || undefined, message: c.message,
  }));

/** Vertical gap between stacked root blocks when we lay a parsed script out. */
const ROW_GAP = 92;

/** Space between auto-stacked root blocks on the canvas. */
const STACK_GAP = 16;

/** Zoom bounds, shared by the buttons, the wheel and the pinch gesture. */
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

/**
 * Where a pinch is allowed to settle. Uneven on purpose — the useful stops
 * cluster around 100%, and "fit a block on a phone screen" lands near 50%, so a
 * flat 25% grid would spend half its detents at the top end where nobody works.
 */
const ZOOM_STOPS = [0.3, 0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Nearest stop, but only within a tolerance — a deliberate 92% survives instead
 * of being yanked to 100%, while the near-misses a pinch actually produces get
 * cleaned up. Applied on release, never mid-gesture: snapping live makes the
 * pinch feel sticky, as it fights the fingers between stops.
 */
const SNAP_TOLERANCE = 0.08;
const snapZoom = (z: number) => {
  const nearest = ZOOM_STOPS.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a));
  return Math.abs(nearest - z) <= SNAP_TOLERANCE ? nearest : z;
};

/**
 * Only the indexed access is used, and React's synthetic TouchList and the DOM's
 * differ in whether they are iterable — typing the minimum both satisfy lets one
 * helper serve the React handlers and the window listeners alike.
 */
type TouchPoints = { [index: number]: { clientX: number; clientY: number } };

const touchDistance = (t: TouchPoints) =>
  Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

const touchCenter = (t: TouchPoints) => ({
  x: (t[0].clientX + t[1].clientX) / 2,
  y: (t[0].clientY + t[1].clientY) / 2,
});

/**
 * Whether a gesture starting here should drag the block.
 *
 * Interactive controls are excluded so a drag never steals a tap the user meant
 * for a field — and `select` matters as much as `input` here, since a native
 * picker that gets dragged out from under the finger can't be opened at all.
 */
const isDragHandle = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !el?.closest?.('input, textarea, button, select, option, label, a');
};
/** Above this many roots we collapse by default — a 273-root file is a wall. */
const AUTO_COLLAPSE_ABOVE = 40;

const BlockCanvas: React.FC<BlockCanvasProps> = ({
  scripts, setScripts, activeScriptId, setActiveScriptId, simInput, worldState,
  knowledgeBase, onApplyStoryCards, problems: runProblems = [], onGoTo,
}) => {
  const activeScript = scripts.find(s => s.id === activeScriptId);

  // Compact swaps the pan/zoom canvas for a stacked list. The canvas is a
  // mouse-only surface — free positioning, drag to move, ctrl+wheel to zoom —
  // and none of those inputs exist on a phone, where a fixed-width block also
  // simply doesn't fit. Stacked keeps every block full-width and reachable.
  const { isCompact } = useLayoutMode();

  const [program, setProgram] = useState<BlockProgram>({ roots: [] });
  const [pan, setPan] = useState({ x: 40, y: 24 });
  const [zoom, setZoom] = useState(1);
  const [paletteFor, setPaletteFor] = useState<{ blockId: string; slot: string } | null>(null);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Scratch runner. `runOrder` is block ids in the order the user picked them —
  // click order is the run order, which is what makes "organize the order" work
  // without a separate reordering UI.
  const [runOrder, setRunOrder] = useState<string[]>([]);
  const [runResult, setRunResult] = useState<BlockRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [applied, setApplied] = useState(false);
  const [hookResult, setHookResult] = useState<HookRunResult | null>(null);
  /** The blocks and code of the last selection run, to map its error lines back to blocks. */
  const lastSelection = useRef<{ blocks: BlockNode[]; code: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  /** Roots drawn on the canvas: all of them, or the ones opened from the outline. */
  const [shown, setShown] = useState<'all' | Set<string>>('all');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showOutline, setShowOutline] = useState(true);

  /** The Library runs ahead of every hook, in test runs as in AI Dungeon. */
  const libraryCode = useMemo(
    () => (activeScript?.name === 'Library' ? '' : scripts.find(s => s.name === 'Library')?.code ?? ''),
    [scripts, activeScript?.name],
  );

  // The code we last generated. Incoming code equal to this means the change
  // came from us, so re-parsing would throw away the user's canvas layout (and
  // fight their typing). Only genuinely external edits trigger a re-parse.
  const lastEmitted = useRef<string | null>(null);
  const dragState = useRef<
    | { mode: 'pan'; startX: number; startY: number; origin: { x: number; y: number } }
    | { mode: 'block'; id: string; startX: number; startY: number; origin: { x: number; y: number } }
    | null
  >(null);
  /** Live two-finger zoom. Held separately so a pinch can't be half a drag. */
  const pinchState = useRef<
    | {
        startDist: number;
        startZoom: number;
        origin: { x: number; y: number };
        center: { x: number; y: number };
        /**
         * What the last move actually applied. Release needs the live transform
         * to snap from, and reading `zoom`/`pan` there would see the values
         * captured when the effect ran, not the ones the pinch just set.
         */
        applied: { zoom: number; pan: { x: number; y: number }; cx: number; cy: number } | null;
      }
    | null
  >(null);
  /** The canvas element, for converting touch coordinates to canvas-local ones. */
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------------- code → blocks
  useEffect(() => {
    if (!activeScript) {
      setProgram({ roots: [] });
      return;
    }
    if (activeScript.code === lastEmitted.current) return; // our own write-back

    const parsed = parseCode(activeScript.code ?? '');
    const collapse = parsed.roots.length > AUTO_COLLAPSE_ABOVE;
    parsed.roots.forEach((root, i) => {
      root.pos = { x: 0, y: i * ROW_GAP };
      if (collapse) root.collapsed = true;
    });
    setProgram(parsed);
    lastEmitted.current = activeScript.code;
    // A big script starts with an empty canvas: drawing hundreds of blocks at
    // once is slow and overwhelming. The outline lists them all; open what you need.
    setShown(parsed.roots.length > FOCUS_ABOVE ? new Set() : 'all');
    setFocusId(null);
  }, [activeScript?.id, activeScript?.code]);

  // Switching scripts clears the last test run — it described another script.
  useEffect(() => {
    setHookResult(null);
    setRunResult(null);
  }, [activeScript?.id]);

  // ---------------------------------------------------------------- blocks → code
  const commit = useCallback(
    (next: BlockProgram) => {
      setProgram(next);
      if (!activeScript) return;
      // Execution order follows canvas position, top to bottom.
      const ordered = {
        ...next,
        roots: [...next.roots].sort(
          (a, b) => (a.pos?.y ?? 0) - (b.pos?.y ?? 0) || (a.pos?.x ?? 0) - (b.pos?.x ?? 0),
        ),
      };
      const code = generateCode(ordered);
      lastEmitted.current = code;
      setScripts(scripts.map(s => (s.id === activeScript.id ? { ...s, code } : s)));
    },
    [activeScript, scripts, setScripts],
  );

  const generated = useMemo(() => generateCode(program), [program]);

  /** Every function declared in this script, at any depth — the Call picker's list. */
  const functionNames = useMemo(() => {
    const names: string[] = [];
    const walk = (nodes: BlockNode[]) => {
      for (const n of nodes) {
        if (n.kind === 'function' && n.fields.name) names.push(n.fields.name);
        Object.values(n.slots).forEach(walk);
      }
    };
    walk(program.roots);
    return [...new Set(names)];
  }, [program]);

  // ---------------------------------------------------------------- tree edits
  /** Replace a block anywhere in the tree by id. */
  const replaceDeep = (nodes: BlockNode[], id: string, next: BlockNode): BlockNode[] =>
    nodes.map(n => {
      if (n.id === id) return next;
      const slots: Record<string, BlockNode[]> = {};
      let touched = false;
      for (const [k, list] of Object.entries(n.slots)) {
        const updated = replaceDeep(list, id, next);
        if (updated !== list) touched = true;
        slots[k] = updated;
      }
      return touched ? { ...n, slots } : n;
    });

  /** Add blocks into a named slot of the block with the given id (at the end, or the start). */
  const insertInto = (nodes: BlockNode[], id: string, slot: string, blocks: BlockNode[], atStart = false): BlockNode[] =>
    nodes.map(n => {
      if (n.id === id) {
        const list = n.slots[slot] ?? [];
        return { ...n, collapsed: false, slots: { ...n.slots, [slot]: atStart ? [...blocks, ...list] : [...list, ...blocks] } };
      }
      const slots: Record<string, BlockNode[]> = {};
      for (const [k, list] of Object.entries(n.slots)) slots[k] = insertInto(list, id, slot, blocks, atStart);
      return { ...n, slots };
    });

  /** Show a root on the canvas (no-op when all are shown). */
  const reveal = (rootId: string) =>
    setShown(s => (s === 'all' || s.has(rootId) ? s : new Set([...s, rootId])));

  /**
   * Insert blocks — into a slot when `target` is given, otherwise as new roots
   * at the bottom — then reveal and point at the first one.
   */
  const insertBlocks = (blocks: BlockNode[], target?: { blockId: string; slot: string; atStart?: boolean }) => {
    if (!blocks.length) return;
    let roots: BlockNode[];
    if (!target) {
      const maxY = program.roots.reduce((m, r) => Math.max(m, r.pos?.y ?? 0), 0);
      blocks.forEach((b, i) => { b.pos = { x: 0, y: maxY + ROW_GAP * (i + 1) }; });
      roots = [...program.roots, ...blocks];
      setShown(s => (s === 'all' ? s : new Set([...s, ...blocks.map(b => b.id)])));
    } else {
      roots = insertInto(program.roots, target.blockId, target.slot, blocks, target.atStart);
      const root = rootOf(roots, target.blockId);
      if (root) reveal(root.id);
    }
    commit({ ...program, roots });
    setFocusId(blocks[0].id);
  };

  const addFromPalette = (entry: PaletteEntry) => {
    const blocks = entry.makeMany ? entry.makeMany() : [entry.make()];
    insertBlocks(blocks, paletteFor ?? undefined);
    // Close on pick. The panel sits behind a full-screen scrim, so leaving it
    // open after a choice left the canvas visible but unclickable.
    setPaletteOpen(false);
    setPaletteFor(null);
    setPaletteQuery('');
  };

  // ---------------------------------------------------------------- canvas input
  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return; // plain scroll pans the page normally
    e.preventDefault();
    setZoom(z => clampZoom(z - e.deltaY * 0.002));
  };

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return; // only the background pans
    dragState.current = { mode: 'pan', startX: e.clientX, startY: e.clientY, origin: { ...pan } };
  };

  /**
   * Begin a drag from a touch. Mirrors the mouse handlers, but a second finger
   * means the user is pinching, not dragging — so any in-flight drag is dropped
   * rather than fighting the zoom for the same gesture.
   */
  const onCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      dragState.current = null;
      pinchState.current = {
        startDist: touchDistance(e.touches),
        startZoom: zoom,
        origin: { ...pan },
        center: touchCenter(e.touches),
        applied: null,
      };
      return;
    }
    if (e.touches.length !== 1) return;
    if (e.target !== e.currentTarget) return; // only the background pans
    const t = e.touches[0];
    dragState.current = { mode: 'pan', startX: t.clientX, startY: t.clientY, origin: { ...pan } };
  };

  useEffect(() => {
    // Shared by both pointer sources: a drag is a drag regardless of what moved.
    const applyDrag = (clientX: number, clientY: number) => {
      const d = dragState.current;
      if (!d) return;
      const dx = (clientX - d.startX) / zoom;
      const dy = (clientY - d.startY) / zoom;
      if (d.mode === 'pan') {
        setPan({ x: d.origin.x + dx * zoom, y: d.origin.y + dy * zoom });
      } else {
        setProgram(p => ({
          ...p,
          roots: p.roots.map(r =>
            r.id === d.id ? { ...r, pos: { x: d.origin.x + dx, y: d.origin.y + dy } } : r,
          ),
        }));
      }
    };
    const endDrag = () => {
      // Reordering by drag changes execution order, so re-emit on release
      // rather than on every move event.
      if (dragState.current?.mode === 'block') commit(program);
      dragState.current = null;
    };

    const onMouseMove = (e: MouseEvent) => applyDrag(e.clientX, e.clientY);

    const onTouchMove = (e: TouchEvent) => {
      const pinch = pinchState.current;
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const dist = touchDistance(e.touches);
        if (!pinch.startDist) return;
        const next = clampZoom(pinch.startZoom * (dist / pinch.startDist));
        // Zoom about the pinch midpoint, not the origin — otherwise the content
        // under the user's fingers slides away as they scale.
        const rect = canvasRef.current?.getBoundingClientRect();
        const cx = pinch.center.x - (rect?.left ?? 0);
        const cy = pinch.center.y - (rect?.top ?? 0);
        const ratio = next / pinch.startZoom;
        const nextPan = {
          x: cx - (cx - pinch.origin.x) * ratio,
          y: cy - (cy - pinch.origin.y) * ratio,
        };
        pinch.applied = { zoom: next, pan: nextPan, cx, cy };
        setPan(nextPan);
        setZoom(next);
        return;
      }
      if (!dragState.current || e.touches.length !== 1) return;
      // Without this the page scrolls underneath the drag on mobile Safari.
      e.preventDefault();
      applyDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      // Lifting either finger ends the pinch; settle it on a round number.
      if (e.touches.length < 2) {
        const applied = pinchState.current?.applied;
        if (applied) {
          const snapped = snapZoom(applied.zoom);
          if (snapped !== applied.zoom) {
            // Re-anchor at the same midpoint the pinch used, so correcting the
            // scale doesn't also slide the content out from under the fingers.
            const ratio = snapped / applied.zoom;
            setPan({
              x: applied.cx - (applied.cx - applied.pan.x) * ratio,
              y: applied.cy - (applied.cy - applied.pan.y) * ratio,
            });
            setZoom(snapped);
          }
        }
        pinchState.current = null;
      }
      if (e.touches.length === 0) endDrag();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
    // Not passive: both branches above need preventDefault to stop the page
    // scrolling or rubber-banding mid-gesture.
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [zoom, program, commit]);

  const resetView = () => {
    setPan({ x: 40, y: 24 });
    setZoom(1);
  };

  /**
   * Roots top-to-bottom. This is the same ordering `commit` generates code from,
   * so the stacked list shows exactly the sequence that will run.
   */
  const orderedRoots = useMemo(
    () =>
      [...program.roots].sort(
        (a, b) => (a.pos?.y ?? 0) - (b.pos?.y ?? 0) || (a.pos?.x ?? 0) - (b.pos?.x ?? 0),
      ),
    [program.roots],
  );

  /**
   * Move a root one slot up or down in the stacked layout.
   *
   * Position stays the source of truth for order rather than array index —
   * that's what the canvas and the code generator already agree on, so this
   * reassigns `pos.y` on a normalized grid instead of introducing a second,
   * competing notion of "order" that the two layouts could disagree about.
   */
  const moveRoot = (id: string, dir: -1 | 1) => {
    const list = [...orderedRoots];
    const i = list.findIndex(r => r.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    commit({
      ...program,
      roots: list.map((r, k) => ({ ...r, pos: { x: r.pos?.x ?? 0, y: k * ROW_GAP } })),
    });
  };

  // ---------------------------------------------------------------- scratch run
  const toggleRun = useCallback((blockId: string) => {
    setRunOrder(order =>
      order.includes(blockId) ? order.filter(id => id !== blockId) : [...order, blockId],
    );
  }, []);

  // Blocks deleted or replaced while selected would otherwise linger as ids that
  // resolve to nothing, so the order is pruned against the live tree.
  const liveRunOrder = useMemo(
    () => runOrder.filter(id => findBlock(program.roots, id)),
    [runOrder, program.roots],
  );

  const doRun = async () => {
    const picked = liveRunOrder
      .map(id => findBlock(program.roots, id))
      .filter((b): b is BlockNode => b !== null);
    if (!picked.length) return;
    setRunning(true);
    setShowConsole(true);
    setShowHelp(false);
    setApplied(false);
    setHookResult(null);
    try {
      const result = await runBlocks(picked, simInput, worldState, knowledgeBase, libraryCode);
      lastSelection.current = { blocks: picked, code: result.code };
      setRunResult(result);
    } finally {
      setRunning(false);
    }
  };

  /** Run the whole script as its hook, the way AI Dungeon would. */
  const doRunHook = async () => {
    if (!activeScript) return;
    setRunning(true);
    setShowConsole(true);
    setShowHelp(false);
    setApplied(false);
    setRunResult(null);
    try {
      setHookResult(await runScriptAsHook(activeScript, libraryCode, simInput, worldState, knowledgeBase));
    } finally {
      setRunning(false);
    }
  };

  /** Opt-in: push this run's card changes into the real deck. */
  const applyStoryCards = () => {
    const changes = hookResult?.storyCards ?? runResult?.storyCards;
    if (!changes) return;
    onApplyStoryCards(toKnowledgeBaseCards(changes.after));
    setApplied(true);
  };

  // ---------------------------------------------------------------- errors → blocks
  /** The deepest block holding `line` of this script (as it is now). */
  const blockForLine = useCallback(
    (line: number) => (activeScript ? blockAtLine(orderedRoots, activeScript.code ?? '', line) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeScript?.code, program.roots],
  );

  /** Problems from the last test run, explained. */
  const consoleProblems = useMemo<Problem[]>(() => {
    if (hookResult) {
      return problemsFromRun(
        { executionError: hookResult.error, scriptErrors: caughtAsScriptErrors(hookResult.hook, hookResult.caught) },
        scripts,
      );
    }
    if (runResult) {
      return problemsFromRun(
        { executionError: runResult.error, scriptErrors: caughtAsScriptErrors('Block Canvas', runResult.caught) },
        scripts,
      );
    }
    return [];
  }, [hookResult, runResult, scripts]);

  /** Every located problem in this script, by block id — outlined red on the canvas. */
  const blockProblems = useMemo(() => {
    const map = new Map<string, Problem>();
    if (!activeScript) return map;
    for (const p of [...consoleProblems, ...runProblems]) {
      if (p.line < 1 || p.stale) continue;
      let id: string | null = null;
      if (p.script === 'Block Canvas' && lastSelection.current) {
        id = blockAtLine(lastSelection.current.blocks, lastSelection.current.code, p.line);
      } else if (p.script === activeScript.name) {
        id = blockForLine(p.line);
      }
      if (id && !map.has(id)) map.set(id, p);
      // A failure inside the Library: mark the step in this script that called it.
      if (p.calledFrom && p.calledFrom.script === activeScript.name) {
        const callId = blockForLine(p.calledFrom.line);
        if (callId && !map.has(callId)) {
          map.set(callId, {
            ...p,
            explanation: { ...p.explanation, title: `This step called into the ${p.script}, which failed: ${p.explanation.title}` },
          });
        }
      }
    }
    return map;
  }, [consoleProblems, runProblems, activeScript, blockForLine]);

  const problemFor = useCallback((id: string) => {
    const p = blockProblems.get(id);
    return p ? { title: p.explanation.title } : undefined;
  }, [blockProblems]);

  const problemRoots = useMemo(
    () => new Set([...blockProblems.keys()].map(id => rootOf(program.roots, id)?.id).filter((x): x is string => !!x)),
    [blockProblems, program.roots],
  );

  /** Bring a block into view: show its root, open the path down to it, pan, flash. */
  const focusBlock = useCallback((id: string) => {
    const root = rootOf(program.roots, id);
    if (!root) return;
    setShown(s => (s === 'all' || s.has(root.id) ? s : new Set([...s, root.id])));
    setFocusId(id);
    if (!isCompact && root.pos) setPan({ x: 40 - root.pos.x * zoom, y: 24 - root.pos.y * zoom });
  }, [program.roots, isCompact, zoom]);

  // Paths to problem blocks and the focused block stay open.
  const forceOpen = useMemo(() => {
    const ids = new Set<string>();
    for (const id of blockProblems.keys()) ancestorIds(program.roots, id).forEach(a => ids.add(a));
    if (focusId) ancestorIds(program.roots, focusId).forEach(a => ids.add(a));
    return ids;
  }, [blockProblems, focusId, program.roots]);

  // After a test run fails, point at the failing block.
  useEffect(() => {
    const first = consoleProblems.find(p => p.severity === 'error') ?? consoleProblems[0];
    if (!first) return;
    const id = first.script === 'Block Canvas' && lastSelection.current
      ? blockAtLine(lastSelection.current.blocks, lastSelection.current.code, first.line)
      : activeScript && first.script === activeScript.name ? blockForLine(first.line) : null;
    if (id) focusBlock(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consoleProblems]);

  /**
   * "Go to line" from a problem: a line in this script, or in the selection that
   * ran, focuses its block right here; anything else (the Library, another hook)
   * opens in the JS Code Editor.
   */
  const canvasGoTo = useCallback<GoTo>((loc) => {
    if (loc.script === 'Block Canvas' && lastSelection.current) {
      const id = blockAtLine(lastSelection.current.blocks, lastSelection.current.code, loc.line);
      if (id) { focusBlock(id); return; }
    }
    if (activeScript && loc.script === activeScript.name) {
      const id = blockForLine(loc.line);
      if (id) { focusBlock(id); return; }
    }
    onGoTo?.(loc);
  }, [activeScript, blockForLine, focusBlock, onGoTo]);

  const suggestions = useMemo<Suggestion[]>(
    () => (activeScript ? adviseScript(program.roots, activeScript.name, libraryCode) : []),
    [program.roots, activeScript, libraryCode],
  );
  const importantCount = suggestions.filter(s => s.level === 'important').length;

  const isShown = (id: string) => shown === 'all' || shown.has(id);
  const visibleRoots = program.roots.filter(r => isShown(r.id));

  // ---------------------------------------------------------------- auto-stacking
  // Roots stack top to bottom by their real rendered height, so an expanded
  // block never sits on top of the next one. Order is untouched — vertical
  // position *is* code order, and stacking keeps every root in its current
  // order — so this never changes the generated code. Hidden roots take no
  // space. A drag in progress is left alone; on release the dragged block
  // settles into its new place in the column.
  const rootEls = useRef(new Map<string, HTMLDivElement>());
  const restack = useCallback(() => {
    if (isCompact || dragState.current?.mode === 'block') return;
    setProgram(p => {
      const ordered = [...p.roots].sort(
        (a, b) => (a.pos?.y ?? 0) - (b.pos?.y ?? 0) || (a.pos?.x ?? 0) - (b.pos?.x ?? 0),
      );
      const next = new Map<string, number>();
      let y = 0;
      for (const r of ordered) {
        next.set(r.id, y);
        const el = rootEls.current.get(r.id);
        if (el) y += el.offsetHeight + STACK_GAP;
      }
      const moved = p.roots.some(r => Math.abs((r.pos?.y ?? 0) - (next.get(r.id) ?? 0)) > 1);
      if (!moved) return p;
      return { ...p, roots: p.roots.map(r => ({ ...r, pos: { x: r.pos?.x ?? 0, y: next.get(r.id) ?? 0 } })) };
    });
  }, [isCompact]);

  // Re-stack after any render that could change sizes, and whenever a root resizes.
  useLayoutEffect(() => { restack(); });
  const resizeObserver = useMemo(
    () => (typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => requestAnimationFrame(restack))),
    [restack],
  );
  useEffect(() => () => resizeObserver?.disconnect(), [resizeObserver]);
  const registerRoot = useCallback((id: string, el: HTMLDivElement | null) => {
    const prev = rootEls.current.get(id);
    if (prev && prev !== el) resizeObserver?.unobserve(prev);
    if (el) {
      rootEls.current.set(id, el);
      resizeObserver?.observe(el);
    } else {
      rootEls.current.delete(id);
    }
  }, [resizeObserver]);

  const filteredPalette = PALETTE.filter(
    p =>
      !paletteQuery ||
      p.label.toLowerCase().includes(paletteQuery.toLowerCase()) ||
      p.hint.toLowerCase().includes(paletteQuery.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#0a0a0c] text-zinc-300 overflow-hidden">
      {/* Script list + outline */}
      <div className={`w-full ${showOutline ? 'md:w-60' : 'md:w-48'} shrink-0 border-b md:border-b-0 md:border-r border-zinc-800/50 flex flex-col min-h-0 md:max-h-none ${showOutline ? 'max-h-[45%]' : ''}`}>
        <div className="h-10 flex items-center px-3 gap-2 border-b border-zinc-800/50 shrink-0">
          <Blocks size={13} className="text-cyan-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Scripts</span>
          <button
            onClick={() => setShowOutline(v => !v)}
            className={`ml-auto p-1 rounded ${showOutline ? 'text-cyan-300' : 'text-zinc-500 hover:text-white'}`}
            title={showOutline ? 'Hide the outline' : 'Show the outline'}
            aria-label="Toggle outline"
          >
            <List size={13} />
          </button>
        </div>
        <div className={`${showOutline ? 'shrink-0 max-h-36' : 'flex-1'} overflow-y-auto custom-scrollbar p-1.5 flex md:block gap-1.5 overflow-x-auto`}>
          {scripts.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveScriptId(s.id)}
              className={`w-full shrink-0 text-left px-2.5 py-2 md:py-1.5 rounded text-xs transition-colors whitespace-nowrap ${
                activeScriptId === s.id
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        {showOutline && activeScript && (
          <div className="flex-1 min-h-0 flex flex-col border-t border-zinc-800/50">
            <BlockOutline
              roots={orderedRoots}
              shown={shown}
              onOpen={id => focusBlock(id)}
              onHide={id => setShown(s => {
                const next = new Set(s === 'all' ? program.roots.map(r => r.id) : s);
                next.delete(id);
                return next;
              })}
              onShowAll={() => setShown('all')}
              onHideAll={() => setShown(new Set())}
              problemRoots={problemRoots}
            />
          </div>
        )}
      </div>

      {/* Canvas column */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="h-10 shrink-0 border-b border-zinc-800/50 flex items-center px-3 gap-2">
          <button
            onClick={() => { setPaletteFor(null); setPaletteQuery(''); setShowCode(false); setPaletteOpen(true); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 text-[11px] font-semibold transition-colors"
          >
            <Plus size={12} /> Add Block
          </button>

          <button
            onClick={doRunHook}
            disabled={running || !activeScript || !activeScript.code?.trim()}
            title={activeScript?.name === 'Library'
              ? 'Run the Library on its own, to check it loads'
              : `Run ${activeScript?.name ?? 'this script'} the way AI Dungeon would — Library first, then the hook with the Director's input as text`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-200
              hover:bg-emerald-500/30 disabled:opacity-40 text-[11px] font-semibold transition-colors"
          >
            <Zap size={12} />
            {running ? 'Running…' : activeScript?.name === 'Library' ? 'Run Library' : 'Run as hook'}
          </button>
          <button
            onClick={doRun}
            disabled={running || liveRunOrder.length === 0}
            title={
              liveRunOrder.length
                ? `Run ${liveRunOrder.length} selected block(s) against the Director's input`
                : 'Select blocks with their ▷ badge to run just those'
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300
              hover:bg-emerald-500/20 disabled:opacity-40 disabled:hover:bg-emerald-500/10
              text-[11px] font-semibold transition-colors"
          >
            <Play size={12} />
            {`Run selected${liveRunOrder.length ? ` (${liveRunOrder.length})` : ''}`}
          </button>
          {liveRunOrder.length > 0 && (
            <button
              onClick={() => setRunOrder([])}
              title="Clear the run selection"
              aria-label="Clear run selection"
              className="p-1 text-zinc-500 hover:text-white transition-colors"
            >
              <Eraser size={12} />
            </button>
          )}

          <div className="flex-1" />
          {program.parseError && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400" title={program.parseError.message}>
              <AlertTriangle size={12} />
              <span className="hidden sm:inline">
                Line {program.parseError.line}: shown as raw code
              </span>
            </div>
          )}
          <button
            onClick={() => { setShowHelp(v => !v); setShowConsole(false); }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors ${
              showHelp ? 'bg-zinc-700 text-white' : importantCount ? 'text-amber-300 hover:text-amber-200' : 'text-zinc-400 hover:text-white'
            }`}
            title="What to add next, and why"
          >
            <Lightbulb size={12} /> Help{suggestions.length ? ` (${suggestions.length})` : ''}
          </button>
          <button
            onClick={() => { setShowConsole(v => !v); setShowHelp(false); }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors ${
              showConsole ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal size={12} /> Console
          </button>
          <button
            onClick={() => setShowCode(v => !v)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors ${
              showCode ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Code2 size={12} /> Code
          </button>
          {/* Zoom belongs to the canvas transform; the stacked list has none. */}
          {!isCompact && (
          <div className="flex items-center gap-0.5 text-zinc-500">
            <button onClick={() => setZoom(z => clampZoom(z - 0.1))} aria-label="Zoom out" className="p-1 hover:text-white transition-colors">
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono w-9 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => clampZoom(z + 0.1))} aria-label="Zoom in" className="p-1 hover:text-white transition-colors">
              <ZoomIn size={13} />
            </button>
            <button onClick={resetView} aria-label="Reset view" className="p-1 hover:text-white transition-colors">
              <Maximize2 size={13} />
            </button>
          </div>
          )}
        </div>

        {/* Side panels sit beside the canvas on a wide screen. Below `md` they
            stack under it instead — full-width in a row would cover the canvas
            entirely and make the blocks unreachable. */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Compact: a plain vertical list. Full-width blocks, no transform, no
              panning — scrolling is the only navigation, which is the one
              gesture that works everywhere. */}
          {isCompact && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0">
              {!activeScript && (
                <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
                  Select a script to start building.
                </div>
              )}
              {activeScript && orderedRoots.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-600">
                  <Blocks size={28} />
                  <p className="text-sm">This script is empty.</p>
                  <p className="text-xs">Use “Add Block” to start building.</p>
                </div>
              )}
              {activeScript && orderedRoots.length > 0 && visibleRoots.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-8">
                  {orderedRoots.length} blocks — open one from the outline above, or Show all.
                </p>
              )}
              {activeScript && orderedRoots.filter(r => isShown(r.id)).map((root, i) => (
                <div key={root.id} className="relative">
                  <BlockNodeView
                    block={root}
                    depth={0}
                    compact
                    onChange={next => commit({ ...program, roots: replaceDeep(program.roots, root.id, next) })}
                    onDelete={() => commit({ ...program, roots: program.roots.filter(r => r.id !== root.id) })}
                    onRequestAdd={(blockId, slot) => { setPaletteFor({ blockId, slot }); setPaletteOpen(true); }}
                    runOrder={liveRunOrder}
                    onToggleRun={toggleRun}
                    functionNames={functionNames}
                    problemFor={problemFor}
                    focusId={focusId}
                    forceOpen={forceOpen}
                  />
                  {/* Drag is a mouse gesture; these buttons are the touch
                      equivalent for "this block runs before that one". */}
                  <div className="flex justify-end gap-1 pt-1.5">
                    <button
                      onClick={() => moveRoot(root.id, -1)}
                      disabled={i === 0}
                      aria-label="Move block up"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg
                        text-zinc-500 enabled:hover:text-white enabled:hover:bg-zinc-800/60
                        disabled:opacity-25 transition-colors"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      onClick={() => moveRoot(root.id, 1)}
                      disabled={i === orderedRoots.length - 1}
                      aria-label="Move block down"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg
                        text-zinc-500 enabled:hover:text-white enabled:hover:bg-zinc-800/60
                        disabled:opacity-25 transition-colors"
                    >
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* The canvas */}
          {!isCompact && (
          <div
            ref={canvasRef}
            onWheel={onWheel}
            onMouseDown={onCanvasMouseDown}
            onTouchStart={onCanvasTouchStart}
            className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              // The browser's own pan/zoom would otherwise consume the gestures
              // before our handlers see them.
              touchAction: 'none',
            }}
          >
            {!activeScript && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
                Select a script to start building.
              </div>
            )}
            {activeScript && program.roots.length > 0 && visibleRoots.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500 pointer-events-none text-center px-6">
                <List size={26} />
                <p className="text-sm">This script has {program.roots.length} blocks.</p>
                <p className="text-xs">Open the ones you want to work on from the outline — search it by name or by what the block does.</p>
              </div>
            )}
            {activeScript && program.roots.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-600 pointer-events-none">
                <Blocks size={28} />
                <p className="text-sm">This script is empty.</p>
                <p className="text-xs">Use “Add Block” to start building.</p>
              </div>
            )}
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              {visibleRoots.map(root => (
                <div
                  key={root.id}
                  ref={el => registerRoot(root.id, el)}
                  className="absolute w-[560px]"
                  onMouseDown={e => {
                    if (!isDragHandle(e.target)) return;
                    e.stopPropagation();
                    dragState.current = {
                      mode: 'block', id: root.id,
                      startX: e.clientX, startY: e.clientY,
                      origin: { ...(root.pos ?? { x: 0, y: 0 }) },
                    };
                  }}
                  onTouchStart={e => {
                    // A second finger is a pinch on the canvas, not a block drag.
                    if (e.touches.length !== 1) return;
                    if (!isDragHandle(e.target)) return;
                    e.stopPropagation();
                    const t = e.touches[0];
                    dragState.current = {
                      mode: 'block', id: root.id,
                      startX: t.clientX, startY: t.clientY,
                      origin: { ...(root.pos ?? { x: 0, y: 0 }) },
                    };
                  }}
                  style={{ left: root.pos?.x ?? 0, top: root.pos?.y ?? 0, touchAction: 'none' }}
                >
                  <BlockNodeView
                    block={root}
                    depth={0}
                    onChange={next => commit({ ...program, roots: replaceDeep(program.roots, root.id, next) })}
                    onDelete={() => commit({ ...program, roots: program.roots.filter(r => r.id !== root.id) })}
                    onRequestAdd={(blockId, slot) => { setPaletteFor({ blockId, slot }); setPaletteOpen(true); }}
                    runOrder={liveRunOrder}
                    onToggleRun={toggleRun}
                    functionNames={functionNames}
                    problemFor={problemFor}
                    focusId={focusId}
                    forceOpen={forceOpen}
                  />
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Scratch console — this run's output, never the simulation's */}
          {showConsole && (
            <RunConsole
              running={running}
              hook={hookResult}
              selection={runResult}
              selectedCount={liveRunOrder.length}
              problems={consoleProblems}
              onGoTo={canvasGoTo}
              onApply={applyStoryCards}
              applied={applied}
              onClose={() => setShowConsole(false)}
            />
          )}

          {showHelp && activeScript && (
            <SuggestionsPanel
              suggestions={suggestions}
              scriptName={activeScript.name}
              onAdd={s => s.add && insertBlocks(s.add.blocks(), s.add.target)}
              onFocus={focusBlock}
              onClose={() => setShowHelp(false)}
            />
          )}

          {/* Generated code, read-only mirror */}
          {showCode && (
            <div className="w-full md:max-w-md shrink-0 h-2/5 md:h-auto border-t md:border-t-0
              md:border-l border-zinc-800/50 flex flex-col bg-black/40 min-h-0">
              <div className="h-8 flex items-center px-3 border-b border-zinc-800/50 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Generated
              </div>
              <pre className="flex-1 overflow-auto custom-scrollbar p-3 text-[11px] font-mono text-zinc-400 whitespace-pre">
                {generated}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Palette */}
      {paletteOpen && (
        <PalettePanel
          entries={filteredPalette}
          query={paletteQuery}
          setQuery={setPaletteQuery}
          target={paletteFor}
          onPick={addFromPalette}
          onClose={() => { setPaletteOpen(false); setPaletteFor(null); setPaletteQuery(''); }}
        />
      )}
    </div>
  );
};

export default BlockCanvas;

// ---------------------------------------------------------------- palette panel

const PalettePanel: React.FC<{
  entries: PaletteEntry[];
  query: string;
  setQuery: (q: string) => void;
  target: { blockId: string; slot: string } | null;
  onPick: (entry: PaletteEntry) => void;
  onClose: () => void;
}> = ({ entries, query, setQuery, target, onPick, onClose }) => (
  <>
    <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
    <div className="fixed right-0 top-0 bottom-0 z-50 w-72 max-w-[85%] bg-[#0c0c0f] border-l border-zinc-800 flex flex-col shadow-2xl">
      <div className="h-12 flex items-center px-3 gap-2 border-b border-zinc-800/50 shrink-0">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
          {target ? 'Add step inside' : 'Add block'}
        </span>
        <button onClick={onClose} aria-label="Close palette" className="ml-auto p-1 text-zinc-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="p-2 border-b border-zinc-800/50">
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5">
          <Search size={12} className="text-zinc-500 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search blocks…"
            className="bg-transparent text-xs text-zinc-200 outline-none w-full"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
        {PALETTE_GROUPS.map(group => {
          const inGroup = entries.filter(e => e.group === group);
          if (!inGroup.length) return null;
          return (
            <div key={group}>
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 px-1 mb-1">
                {group}
              </div>
              {inGroup.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => onPick(entry)}
                  className="w-full text-left px-2 py-2 rounded hover:bg-zinc-800/60 transition-colors group"
                >
                  <div className="text-xs text-zinc-200 group-hover:text-white">{entry.label}</div>
                  <div className="text-[10px] text-zinc-600 leading-snug">{entry.hint}</div>
                </button>
              ))}
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="text-xs text-zinc-600 italic px-1">No blocks match that search.</p>
        )}
      </div>
    </div>
  </>
);
