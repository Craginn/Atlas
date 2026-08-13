import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Blocks, Plus, Search, ZoomIn, ZoomOut, Maximize2, AlertTriangle, Code2, X,
  Play, Terminal, Eraser, ChevronUp, ChevronDown,
} from 'lucide-react';
import { KnowledgeBase, Script, StoryCard, WorldState } from '@/types';
import { BlockNode, BlockProgram } from '@/services/blocks/types';
import { parseCode } from '@/services/blocks/parse';
import { generateCode } from '@/services/blocks/generate';
import { PALETTE, PALETTE_GROUPS, PaletteEntry } from '@/services/blocks/palette';
import {
  runBlocks, findBlock, toKnowledgeBaseCards, BlockRunResult,
} from '@/services/blocks/runBlocks';
import BlockNodeView from './BlockNodeView';
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
  /** Plot Essentials + the real Story Card deck, exposed to scratch runs as `plot`. */
  knowledgeBase: KnowledgeBase;
  /**
   * Commit a scratch run's story card changes. Only ever called from the
   * console's explicit Apply button — running never persists anything.
   */
  onApplyStoryCards: (cards: StoryCard[]) => void;
}

/** Vertical gap between stacked root blocks when we lay a parsed script out. */
const ROW_GAP = 92;

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
  knowledgeBase, onApplyStoryCards,
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
  }, [activeScript?.id, activeScript?.code]);

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

  /** Append a new block into a named slot of the block with the given id. */
  const insertInto = (nodes: BlockNode[], id: string, slot: string, block: BlockNode): BlockNode[] =>
    nodes.map(n => {
      if (n.id === id) {
        return { ...n, slots: { ...n.slots, [slot]: [...(n.slots[slot] ?? []), block] } };
      }
      const slots: Record<string, BlockNode[]> = {};
      for (const [k, list] of Object.entries(n.slots)) slots[k] = insertInto(list, id, slot, block);
      return { ...n, slots };
    });

  const addFromPalette = (entry: PaletteEntry) => {
    const block = entry.make();
    if (!paletteFor) {
      // No target slot — drop it at the bottom of the canvas as a new root.
      const maxY = program.roots.reduce((m, r) => Math.max(m, r.pos?.y ?? 0), 0);
      block.pos = { x: 0, y: maxY + ROW_GAP };
      commit({ ...program, roots: [...program.roots, block] });
    } else {
      commit({ ...program, roots: insertInto(program.roots, paletteFor.blockId, paletteFor.slot, block) });
    }
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
    setApplied(false);
    try {
      setRunResult(await runBlocks(picked, simInput, worldState, knowledgeBase));
    } finally {
      setRunning(false);
    }
  };

  /** Opt-in: push this run's card changes into the real deck. */
  const applyStoryCards = () => {
    if (!runResult?.storyCards) return;
    onApplyStoryCards(toKnowledgeBaseCards(runResult.storyCards.after));
    setApplied(true);
  };

  const filteredPalette = PALETTE.filter(
    p =>
      !paletteQuery ||
      p.label.toLowerCase().includes(paletteQuery.toLowerCase()) ||
      p.hint.toLowerCase().includes(paletteQuery.toLowerCase()),
  );

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#0a0a0c] text-zinc-300 overflow-hidden">
      {/* Script list */}
      <div className="w-full md:w-48 shrink-0 border-b md:border-b-0 md:border-r border-zinc-800/50 flex flex-col">
        <div className="h-10 flex items-center px-3 gap-2 border-b border-zinc-800/50 shrink-0">
          <Blocks size={13} className="text-cyan-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Scripts</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 flex md:block gap-1.5 overflow-x-auto">
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
            onClick={doRun}
            disabled={running || liveRunOrder.length === 0}
            title={
              liveRunOrder.length
                ? `Run ${liveRunOrder.length} selected block(s) against the Director's input`
                : 'Select blocks with their ▷ badge to build a run'
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300
              hover:bg-emerald-500/25 disabled:opacity-40 disabled:hover:bg-emerald-500/15
              text-[11px] font-semibold transition-colors"
          >
            <Play size={12} />
            {running ? 'Running…' : `Run${liveRunOrder.length ? ` (${liveRunOrder.length})` : ''}`}
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
            onClick={() => setShowConsole(v => !v)}
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
              {activeScript && orderedRoots.map((root, i) => (
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
              {program.roots.map(root => (
                <div
                  key={root.id}
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
                  />
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Scratch console — this run's output, never the simulation's */}
          {showConsole && (
            <ConsolePanel
              result={runResult}
              running={running}
              selectedCount={liveRunOrder.length}
              onClose={() => setShowConsole(false)}
              onApply={applyStoryCards}
              applied={applied}
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

// ---------------------------------------------------------------- scratch console

/**
 * Output from the last scratch run. Deliberately its own surface rather than the
 * Sentinel log: nothing here touched the world state, and blending the two would
 * make it look like it had.
 */
const ConsolePanel: React.FC<{
  result: BlockRunResult | null;
  running: boolean;
  selectedCount: number;
  onClose: () => void;
  onApply: () => void;
  applied: boolean;
}> = ({ result, running, selectedCount, onClose, onApply, applied }) => (
  <div className="w-full md:w-80 md:max-w-sm shrink-0 h-2/5 md:h-auto border-t md:border-t-0
    md:border-l border-zinc-800/50 flex flex-col bg-black/40 min-h-0">
    <div className="h-8 shrink-0 flex items-center gap-2 px-3 border-b border-zinc-800/50">
      <Terminal size={11} className="text-emerald-400" />
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
        Scratch Console
      </span>
      {result && !running && (
        <span className="text-[9px] font-mono text-zinc-600 tabular-nums">{result.ms}ms</span>
      )}
      <button
        onClick={onClose}
        aria-label="Close console"
        className="ml-auto p-0.5 text-zinc-600 hover:text-white transition-colors"
      >
        <X size={13} />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 font-mono text-[11px]">
      {running && <p className="text-zinc-500 italic">Running…</p>}

      {!running && !result && (
        <p className="text-zinc-600 italic leading-relaxed">
          {selectedCount
            ? `${selectedCount} block(s) queued. Press Run.`
            : 'Click the ▷ badge on a block to add it to the run. Click order is run order.'}
        </p>
      )}

      {!running && result && (
        <>
          {result.error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-2 text-red-300">
              <div className="text-[9px] font-black uppercase tracking-widest mb-1">
                Error{result.error.line !== 'unknown' && ` · line ${result.error.line}`}
              </div>
              <div className="leading-snug break-words">{result.error.message}</div>
            </div>
          )}

          {result.logs.map((line, i) => (
            <div key={i} className="text-zinc-300 whitespace-pre-wrap break-words leading-snug">
              {line}
            </div>
          ))}

          {/* A run that only touched cards logged nothing but plainly did work,
              so the card panel speaks for it. */}
          {!result.error && result.logs.length === 0 && !result.storyCards && (
            result.inertReason
              ? (
                <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2 text-amber-300/90 leading-snug">
                  {result.inertReason}
                </div>
              )
              : <p className="text-zinc-600 italic">Ran clean — no output logged.</p>
          )}

          {/* Proof that a card edit landed. Shown, never persisted, until asked. */}
          {result.storyCards && (
            <div className="rounded border border-cyan-500/30 bg-cyan-500/5 p-2 space-y-1.5">
              <div className="text-[9px] font-black uppercase tracking-widest text-cyan-300">
                Story Cards
              </div>
              {(['added', 'updated', 'removed'] as const).map(kind => {
                const cards = result.storyCards![kind];
                if (!cards.length) return null;
                const tint = kind === 'added' ? 'text-emerald-300'
                  : kind === 'removed' ? 'text-red-300' : 'text-amber-300';
                return (
                  <div key={kind}>
                    <div className={`text-[9px] uppercase tracking-wider ${tint}`}>
                      {kind} · {cards.length}
                    </div>
                    {cards.map(c => (
                      <div key={c.id} className="text-zinc-300 leading-snug break-words pl-1.5">
                        {c.title || c.keys || '(untitled)'}
                        {c.entry && (
                          <span className="text-zinc-600"> — {c.entry.slice(0, 60)}
                            {c.entry.length > 60 ? '…' : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
              <button
                onClick={onApply}
                disabled={applied}
                className="w-full mt-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors
                  bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25
                  disabled:opacity-50 disabled:hover:bg-cyan-500/15"
              >
                {applied ? 'Applied to Story Cards' : 'Apply these changes'}
              </button>
            </div>
          )}

          {result.result != null && (
            <div className="rounded border border-zinc-800 bg-black/40 p-2">
              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">
                Returned
              </div>
              <pre className="text-emerald-300/90 whitespace-pre-wrap break-words">
                {typeof result.result === 'string'
                  ? result.result
                  : JSON.stringify(result.result, null, 2)}
              </pre>
            </div>
          )}

          <details className="pt-1">
            <summary className="text-[9px] font-black uppercase tracking-widest text-zinc-600 cursor-pointer hover:text-zinc-400">
              Source that ran
            </summary>
            <pre className="mt-1 text-zinc-500 whitespace-pre-wrap break-words leading-snug">
              {result.code}
            </pre>
          </details>

          <p className="text-[9px] text-zinc-700 pt-1 border-t border-zinc-800/50 leading-relaxed">
            Scratch run — nothing was saved. World state is untouched
            {result.storyCards && !applied && ', and story cards change only if you apply them'}.
          </p>
        </>
      )}
    </div>
  </div>
);

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
