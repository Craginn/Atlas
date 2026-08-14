import React, { useRef, useCallback, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import EditorDefault from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import '@/styles/prism-traditional.css';
import { Copy, Search, X, ChevronUp, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { validateScriptSyntax, AID_GLOBALS } from '@/services/offlineSimulationService';
import { LineManager } from '@/services/editor/LineManager';

// Normalize the default export (see StateEditor for rationale).
const Editor = ((EditorDefault as unknown as { default?: typeof EditorDefault })?.default
  ?? EditorDefault) as typeof EditorDefault;

const OPEN = new Set(['(', '[', '{']);
const CLOSE = new Set([')', ']', '}']);
const RAINBOW_DEPTH = 6; // number of distinct nesting colors before cycling
const EDITOR_PADDING = 24; // must match the Editor `padding` prop
const LINE_HEIGHT = 28; // px per row — matches the editor/gutter `leading-7`

// The rainbow-bracket palette (see prism-traditional.css), reused so the indent
// guides share the exact nesting colors the brackets already use.
const NEST_COLORS = ['#818cf8', '#fb7185', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee'];

// Helper to get the rainbow color for a given depth
const getNestColor = (depth: number) => NEST_COLORS[depth % NEST_COLORS.length];

// Above this many visible rows we skip the per-row indent-guide overlay to keep
// keystroke reconciliation cheap on very large files (see gutter perf note).
const GUIDE_LINE_LIMIT = 1500;

interface Structure {
  // Fold region: opening line index → closing line index (0-based). Only
  // multi-line blocks with at least one collapsible interior line are recorded.
  regions: Map<number, number>;
  // Per-line bracket nesting depth at the *start* of the line, for indent guides.
  guideDepth: number[];
}

// Scan the code once to find foldable bracket blocks and per-line nesting depth.
// Strings and comments are skipped so their brackets don't create phantom folds.
function analyzeStructure(code: string): Structure {
  const lines = code.split('\n');
  const regions = new Map<number, number>();
  const guideDepth = new Array(lines.length).fill(0);
  const stack: number[] = []; // opening-line index of each unclosed bracket
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    guideDepth[i] = stack.length;
    const line = lines[i];
    let inStr: string | null = null;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (inBlockComment) {
        if (c === '*' && line[j + 1] === '/') { inBlockComment = false; j++; }
        continue;
      }
      if (inStr) {
        if (c === '\\') { j++; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '/' && line[j + 1] === '/') break; // rest of line is a comment
      if (c === '/' && line[j + 1] === '*') { inBlockComment = true; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
      if (OPEN.has(c)) stack.push(i);
      else if (CLOSE.has(c)) {
        const open = stack.pop();
        // Foldable only if there's at least one interior line to hide (the open
        // and close lines both stay visible), and keep the widest span per opener.
        if (open != null && i - open >= 2 && (!regions.has(open) || regions.get(open)! < i)) {
          regions.set(open, i);
        }
      }
    }
  }
  return { regions, guideDepth };
}

// The words the autocomplete always knows about, independent of what's typed:
// the AID scripting globals plus JS keywords. Code-local identifiers are mixed
// in at suggest time (see buildSuggestions) so "fill-ins" match nearby usage.
const JS_KEYWORDS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'default', 'break', 'continue', 'typeof', 'instanceof', 'new',
  'try', 'catch', 'finally', 'throw', 'class', 'extends', 'super', 'this', 'null',
  'undefined', 'true', 'false', 'async', 'await', 'of', 'in', 'delete', 'void',
  'yield', 'JSON', 'Object', 'Array', 'Math', 'String', 'Number', 'Boolean',
  'console', 'push', 'pop', 'slice', 'splice', 'map', 'filter', 'forEach',
  'includes', 'indexOf', 'length', 'toString', 'stringify', 'parse',
];

// Highlight JS while adding bracket-depth classes to (){}[] punctuation so
// nested brackets get consistent, distinct rainbow colors. Prism's default
// theme colors all punctuation flat, which made deep nesting hard to read.
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let bracketDepth = 0;

function stringify(token: string | Prism.Token): string {
  if (typeof token === 'string') {
    return escapeHtml(token);
  }
  const content = Array.isArray(token.content)
    ? token.content.map(stringify).join('')
    : stringifyContent(token.content);

  if (token.type === 'punctuation') {
    const raw = typeof token.content === 'string' ? token.content : '';
    if (OPEN.has(raw)) {
      const color = getNestColor(bracketDepth);
      const cls = `token punctuation bracket-depth-${bracketDepth % RAINBOW_DEPTH}`;
      bracketDepth++;
      return `<span class="${cls}" style="color: ${color}">${content}</span>`;
    }
    if (CLOSE.has(raw)) {
      bracketDepth = Math.max(0, bracketDepth - 1);
      const color = getNestColor(bracketDepth);
      const cls = `token punctuation bracket-depth-${bracketDepth % RAINBOW_DEPTH}`;
      return `<span class="${cls}" style="color: ${color}">${content}</span>`;
    }
  }

  const alias = Array.isArray(token.alias) ? token.alias.join(' ') : token.alias || '';
  return `<span class="token ${token.type}${alias ? ' ' + alias : ''}">${content}</span>`;
}

function stringifyContent(content: string | Prism.Token | (string | Prism.Token)[]): string {
  if (typeof content === 'string') return escapeHtml(content);
  if (Array.isArray(content)) return content.map(stringify).join('');
  return stringify(content);
}

interface CodeBufferProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  color: string;
  id: string;
  isReadOnly?: boolean;
  isActive: boolean;
  // An external request (e.g. from the Code Explorer's cross-file search) to open
  // the find widget pre-filled with a query. `nonce` changes on each request so
  // re-searching the same term still re-triggers.
  findRequest?: { query: string; nonce: number } | null;
}

const editorStyle = {
  fontFamily: '"Fira Code", "Fira Mono", monospace',
};

const highlightWithJs = (code: string): string => {
  bracketDepth = 0;
  const tokens = Prism.tokenize(code, Prism.languages.javascript);
  return tokens.map(stringify).join('');
};

// Worker-based highlighting to avoid blocking the main thread
const useHighlightWorker = (code: string) => {
  const [highlighted, setHighlighted] = useState<string>('');
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    // In a production environment, this would be a separate file bundled by the build system.
    // For this implementation, we'll use a Blob to keep it self-contained.
    const workerCode = `
      import Prism from 'prismjs';
      import 'prismjs/components/prism-clike';
      import 'prismjs/components/prism-javascript';
      self.onmessage = (e) => {
        const { code, requestId } = e.data;
        const tokens = Prism.tokenize(code, Prism.languages.javascript);
        const stringify = (token) => {
          if (typeof token === 'string') return token;
          const content = Array.isArray(token.content)
            ? token.content.map(stringify).join('')
            : (typeof token.content === 'string' ? token.content : stringify(token.content));
          const alias = Array.isArray(token.alias) ? token.alias.join(' ') : token.alias || '';
          return \`<span class="token \${token.type}\${alias ? ' ' + alias : ''}">\${content}</span>\`;
        };
        const html = tokens.map(stringify).join('');
        self.postMessage({ html, requestId });
      };
    `;
    
    // This is a simplified worker creation. In a real Vite project, 
    // we'd use new Worker(new URL('./worker.ts', import.meta.url))
    // Since we are in a React component, we'll use the existing worker file if possible.
    // For now, I'll implement the logic to use the worker we just created.
    workerRef.current = new Worker(new URL('../../services/editor/workers/highlight.worker.ts', import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      const { html, requestId } = e.data;
      if (requestId === requestIdRef.current) {
        setHighlighted(html);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (workerRef.current) {
      const requestId = ++requestIdRef.current;
      workerRef.current.postMessage({ code, requestId });
    }
  }, [code]);

  return highlighted;
};

// The partial identifier immediately to the left of the caret. Returns null when
// the caret isn't sitting at the end of a word (nothing to complete).
function getActiveToken(text: string, caret: number): { word: string; start: number } | null {
  let start = caret;
  while (start > 0 && /[A-Za-z0-9_$]/.test(text[start - 1])) start--;
  const word = text.slice(start, caret);
  if (!word || !/^[A-Za-z_$]/.test(word)) return null;
  return { word, start };
}

// Rank + filter the completion dictionary against the partial word. Code-local
// identifiers (auto-detected from what's already written) are folded in so the
// suggestions bias toward names the script already uses.
function buildSuggestions(code: string, word: string): string[] {
  const local = code.match(/[A-Za-z_$][\w$]*/g) || [];
  const dict = new Set<string>([...AID_GLOBALS, ...JS_KEYWORDS, ...local]);
  const lower = word.toLowerCase();
  return Array.from(dict)
    .filter(w => w !== word && w.toLowerCase().startsWith(lower))
    // Shorter, closer matches first; then alphabetical for stability.
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .slice(0, 8);
}

// An off-screen div that lays text out EXACTLY like the editor's <textarea>, so we
// can read back pixel positions the DOM won't hand us directly. The mirror copies
// the computed font metrics (which already reflect the 16px touch anti-zoom rule),
// and — since the editor now soft-wraps (`white-space: pre-wrap`, see index.css) —
// it wraps at the textarea's own content width. Getting that width right is what
// keeps the caret and the line measurements from drifting on wrapped lines.
function makeMirror(ta: HTMLTextAreaElement): HTMLDivElement {
  const div = document.createElement('div');
  const style = window.getComputedStyle(ta);
  const props = [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
    'letterSpacing', 'wordSpacing', 'lineHeight', 'textTransform', 'textIndent',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'tabSize',
  ] as const;
  props.forEach(p => { (div.style as any)[p] = style[p]; });
  div.style.position = 'absolute';
  div.style.top = '0';
  div.style.left = '0';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.overflowWrap = 'anywhere';
  // clientWidth is content+padding (border/scrollbar excluded); with border-box and
  // the padding copied above, the content box matches the textarea's exactly, so
  // lines break at the same points.
  div.style.boxSizing = 'border-box';
  div.style.border = '0';
  div.style.width = `${ta.clientWidth}px`;
  return div;
}

// Pixel position of a caret offset inside the textarea (standard mirror trick —
// there's no native API). `top`/`left` are content-space, padding included.
function caretCoords(ta: HTMLTextAreaElement, position: number): { top: number; left: number } {
  const div = makeMirror(ta);
  div.textContent = ta.value.slice(0, position);
  const marker = document.createElement('span');
  marker.textContent = ta.value.slice(position) || '.';
  div.appendChild(marker);
  document.body.appendChild(div);
  const top = marker.offsetTop;
  const left = marker.offsetLeft;
  document.body.removeChild(div);
  return { top, left };
}

// The top offset of every source line once wrapping is applied, plus the total
// content height. Each line is preceded by a zero-width marker whose offsetTop is
// the line's top; a trailing marker sits on a phantom final row to give the bottom.
// This is what lets the gutter numbers, fold arrows and indent guides follow lines
// that wrap to multiple visual rows instead of assuming a fixed row height.
function measureLineTops(ta: HTMLTextAreaElement): { tops: number[]; total: number } {
  const div = makeMirror(ta);
  const lines = ta.value.split('\n');
  const markers: HTMLSpanElement[] = [];
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < lines.length; i++) {
    const m = document.createElement('span');
    markers.push(m);
    fragment.appendChild(m);
    fragment.appendChild(document.createTextNode(lines[i]));
    fragment.appendChild(document.createTextNode('\n'));
  }
  const end = document.createElement('span');
  fragment.appendChild(end);
  div.appendChild(fragment);
  document.body.appendChild(div);
  const tops = markers.map(m => m.offsetTop);
  const bottom = end.offsetTop;
  document.body.removeChild(div);
  return { tops, total: bottom + EDITOR_PADDING };
}

const CodeBuffer: React.FC<CodeBufferProps> = ({ title, value, onChange, isReadOnly = false, isActive, color, findRequest }) => {
  const safeValue = value || '';
  const gutterRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lineManagerRef = useRef<LineManager | null>(null);

  // Progressive loading state: start with a manageable chunk and expand as user scrolls
  const [renderLimit, setRenderLimit] = useState(2000);

  // Sync LineManager with the FULL safeValue to maintain correct indexing
  useEffect(() => {
    if (!lineManagerRef.current) {
      lineManagerRef.current = new LineManager(safeValue);
    } else {
      lineManagerRef.current.setFullText(safeValue);
    }
  }, [safeValue]);

  // ── Structure: fold regions + nesting depth ────────────────────────────────
  // Use full safeValue for structure to allow folding across the whole file
  const structure = useMemo(() => analyzeStructure(safeValue), [safeValue]);

  // Which block-opening lines are currently collapsed (keyed by source line).
  const [folded, setFolded] = useState<Set<number>>(new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);

  // Project the full source down to the visible ("display") text by dropping the
  // interior lines of each collapsed region. `displayToSource` maps each visible
  // row back to its original line so the gutter can show the real line numbers,
  // and `hiddenSet` is the set of source lines currently tucked away.
  const { displayValue, displayToSource, hiddenSet } = useMemo(() => {
    const src = safeValue.split('\n');
    const hidden = new Set<number>();
    folded.forEach(start => {
      const end = structure.regions.get(start);
      if (end != null) for (let i = start + 1; i < end; i++) hidden.add(i);
    });
    const disp: string[] = [];
    const map: number[] = [];
    
    // Only process lines up to the current render limit for DOM stability
    const limit = Math.min(src.length, renderLimit);
    for (let i = 0; i < limit; i++) {
      if (hidden.has(i)) continue;
      disp.push(src[i]);
      map.push(i);
    }
    return { displayValue: disp.join('\n'), displayToSource: map, hiddenSet: hidden };
  }, [safeValue, folded, structure, renderLimit]);

  // Measured top offset of each visible row plus the total content height. Because
  // the editor soft-wraps, a row can be taller than one line, so the gutter, fold
  // arrows and indent guides can't assume a fixed row height — they read positions
  // from here. Populated by a layout effect (see below) after each render/resize;
  // until then, and for rows past the measured range, we fall back to LINE_HEIGHT.
  const [rowLayout, setRowLayout] = useState<{ tops: number[]; total: number }>({ tops: [], total: 0 });
  const [measureKey, setMeasureKey] = useState(0);
  const measureTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const rowTop = useCallback((i: number): number => {
    const t = rowLayout.tops;
    return i < t.length ? t[i] : EDITOR_PADDING + i * LINE_HEIGHT;
  }, [rowLayout]);

  const rowHeight = useCallback((i: number): number => {
    const t = rowLayout.tops;
    if (i >= t.length) return LINE_HEIGHT;
    const next = i + 1 < t.length ? t[i + 1] : rowLayout.total - EDITOR_PADDING;
    return next - t[i];
  }, [rowLayout]);

  const contentHeight = rowLayout.total || displayToSource.length * LINE_HEIGHT + 2 * EDITOR_PADDING;

  const toggleFold = useCallback((start: number) => {
    setFolded(prev => {
      const next = new Set(prev);
      if (next.has(start)) next.delete(start); else next.add(start);
      return next;
    });
  }, []);

  // The editor edits the *projected* text. Translate that edit back onto the full
  // source so nothing collapsed is lost. When nothing is folded this is a no-op
  // pass-through. Otherwise we diff the edit down to a line span (common prefix /
  // suffix), map it to source lines, splice the replacement in, and re-append any
  // hidden lines that happened to fall inside the edited span (so a stray edit on
  // a fold header can never delete its collapsed body). Folds outside the edit are
  // kept (shifted); folds overlapping it are dropped.
  const applyDisplayChange = useCallback((newDisplay: string) => {
    if (folded.size === 0) { onChange(newDisplay); return; }
    const oldLines = displayValue.split('\n');
    const newLines = newDisplay.split('\n');
    const fullLines = safeValue.split('\n');

    let p = 0;
    const maxP = Math.min(oldLines.length, newLines.length);
    while (p < maxP && oldLines[p] === newLines[p]) p++;
    let s = 0;
    const maxS = Math.min(oldLines.length - p, newLines.length - p);
    while (s < maxS && oldLines[oldLines.length - 1 - s] === newLines[newLines.length - 1 - s]) s++;

    const oldChangeEnd = oldLines.length - s; // exclusive, in display space
    const srcStart = p < displayToSource.length ? displayToSource[p] : fullLines.length;
    const srcEnd = oldChangeEnd < displayToSource.length ? displayToSource[oldChangeEnd] : fullLines.length;
    const replacement = newLines.slice(p, newLines.length - s);

    const preserved: string[] = [];
    for (let i = srcStart; i < srcEnd; i++) if (hiddenSet.has(i)) preserved.push(fullLines[i]);

    const newFull = [
      ...fullLines.slice(0, srcStart),
      ...replacement,
      ...preserved,
      ...fullLines.slice(srcEnd),
    ];

    const delta = replacement.length + preserved.length - (srcEnd - srcStart);
    const nextFolded = new Set<number>();
    folded.forEach(start => {
      const end = structure.regions.get(start);
      if (end == null) return;
      if (end < srcStart) nextFolded.add(start);           // entirely before the edit
      else if (start >= srcEnd) nextFolded.add(start + delta); // entirely after — shifted
      // overlapping the edit → dropped (its body, if any, was preserved above)
    });
    setFolded(nextFolded);
    onChange(newFull.join('\n'));
  }, [folded, displayValue, safeValue, displayToSource, hiddenSet, structure, onChange]);

  // ── Validation (drives the red bar) ────────────────────────────────────────
  const validation = useMemo(
    () => validateScriptSyntax(safeValue, title !== 'Library'),
    [safeValue, title]
  );
  const errorCount = validation.errors.length;
  const hasErrors = errorCount > 0;

  // ── IDE find widget ────────────────────────────────────────────────────────
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findIndex, setFindIndex] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  // Search the projected (visible) text, so match offsets line up with what the
  // textarea actually holds when regions are collapsed.
  const matches = useMemo(() => {
    if (!findQuery) return [] as number[];
    const out: number[] = [];
    const hay = displayValue.toLowerCase();
    const needle = findQuery.toLowerCase();
    let from = 0;
    let at = hay.indexOf(needle, from);
    while (at !== -1) {
      out.push(at);
      from = at + Math.max(1, needle.length);
      at = hay.indexOf(needle, from);
    }
    return out;
  }, [findQuery, displayValue]);

  const getTextarea = useCallback(
    () => scrollContainerRef.current?.querySelector('textarea') as HTMLTextAreaElement | null,
    []
  );

  // Re-measure wrapped line positions after every content change and after the
  // width changes (a resize re-wraps every line). useLayoutEffect so the gutter and
  // guides are positioned before the browser paints — no visible one-frame drift.
  useLayoutEffect(() => {
    const ta = getTextarea();
    if (!ta) return;
    
    if (measureTimeoutRef.current) clearTimeout(measureTimeoutRef.current);
    
    measureTimeoutRef.current = setTimeout(() => {
      setRowLayout(measureLineTops(ta));
    }, 10);
  }, [displayValue, measureKey, getTextarea]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setMeasureKey(k => k + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // `moveFocus` is false while auto-highlighting as the user types, so focus
  // stays in the find input; it's true for explicit Enter/arrow navigation.
  const selectMatch = useCallback((i: number, moveFocus = true) => {
    if (matches.length === 0) return;
    const idx = ((i % matches.length) + matches.length) % matches.length;
    const ta = getTextarea();
    if (!ta) return;
    const start = matches[idx];
    if (moveFocus) ta.focus();
    ta.setSelectionRange(start, start + findQuery.length);
    // Bring the match into view. Rather than set scrollTop on a specific element
    // (which breaks if the real scroll container isn't the one we assume), drop a
    // transient marker at the match's pixel position and let native scrollIntoView
    // walk up to whichever ancestor actually scrolls. `caretCoords` is textarea
    // content-space (padding included) and the editor sits at the container's
    // top-left, so the same offsets place the marker over the match.
    const container = scrollContainerRef.current;
    if (container) {
      const { top, left } = caretCoords(ta, start);
      const marker = document.createElement('div');
      marker.style.cssText = `position:absolute;top:${top}px;left:${left}px;width:1px;height:${LINE_HEIGHT}px;pointer-events:none;`;
      container.appendChild(marker);
      // Run after focus/selection so their own scroll adjustments don't override us.
      marker.scrollIntoView({ block: 'center', inline: 'nearest' });
      container.removeChild(marker);
    }
    setFindIndex(idx);
  }, [matches, findQuery, getTextarea]);

  // Set on an external find request so the follow-up jump focuses the editor
  // (see below). Consumed once by the auto-search effect.
  const externalJump = useRef(false);

  // Auto-search: as the query (or file) changes, jump to the first match. While
  // the user types in the find box we keep focus there (moveFocus=false) so results
  // highlight live. But arriving from the Explorer's cross-file search must move
  // focus into the editor: an unfocused textarea paints no selection, so without
  // this the match scrolls into view but isn't visibly highlighted.
  useEffect(() => {
    if (matches.length > 0) selectMatch(0, externalJump.current);
    else setFindIndex(0);
    externalJump.current = false;
    // selectMatch is intentionally omitted; it changes with `matches`, which is
    // already the trigger, and including it would re-run mid-selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  // Honor an external find request (from the Explorer's cross-file search). Flag
  // the jump as external so the effect above focuses the match in the editor.
  useEffect(() => {
    if (findRequest?.query) {
      externalJump.current = true;
      setFindOpen(true);
      setFindQuery(findRequest.query);
      // If nothing changed (same file + query), the auto-search effect won't run
      // to consume the flag — clear it after this render so it can't misfire on a
      // later, unrelated match change.
      requestAnimationFrame(() => { externalJump.current = false; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findRequest?.nonce]);

  // ── Autocomplete ───────────────────────────────────────────────────────────
  const [completions, setCompletions] = useState<string[]>([]);
  const [completionIndex, setCompletionIndex] = useState(0);
  const [completionPos, setCompletionPos] = useState<{ top: number; left: number } | null>(null);
  const tokenRef = useRef<{ word: string; start: number } | null>(null);
  const pendingCaret = useRef<number | null>(null);

  const closeCompletions = useCallback(() => {
    setCompletions([]);
    setCompletionPos(null);
    tokenRef.current = null;
  }, []);

  const refreshCompletions = useCallback(() => {
    const ta = getTextarea();
    if (!ta || isReadOnly) return closeCompletions();
    const caret = ta.selectionStart;
    // Only offer completions for a collapsed caret sitting at a word's end.
    if (caret !== ta.selectionEnd) return closeCompletions();
    const token = getActiveToken(ta.value, caret);
    if (!token || token.word.length < 1) return closeCompletions();
    const suggestions = buildSuggestions(ta.value, token.word);
    if (suggestions.length === 0) return closeCompletions();
    tokenRef.current = token;
    // Coords are in the textarea's content space. The dropdown is an absolutely
    // positioned child of the (scrolling) editor, so it shares that space — no
    // scroll/gutter offset needed. Drop it just below the caret's line.
    const { top, left } = caretCoords(ta, caret);
    setCompletionPos({ top: top + 24, left });
    setCompletions(suggestions);
    setCompletionIndex(0);
  }, [getTextarea, isReadOnly, closeCompletions]);

  const acceptCompletion = useCallback((word: string) => {
    const ta = getTextarea();
    const token = tokenRef.current;
    if (!ta || !token) return;
    const caret = ta.selectionStart;
    const next = ta.value.slice(0, token.start) + word + ta.value.slice(caret);
    pendingCaret.current = token.start + word.length;
    // `ta.value` is the projected view, so route through the fold-aware handler.
    applyDisplayChange(next);
    closeCompletions();
  }, [getTextarea, applyDisplayChange, closeCompletions]);

  // Restore the caret after a completion rewrites the (controlled) value.
  useLayoutEffect(() => {
    if (pendingCaret.current == null) return;
    const ta = getTextarea();
    if (ta) {
      ta.focus();
      ta.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  }, [safeValue, getTextarea]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl/Cmd+F opens the in-editor find, overriding the browser's.
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      setFindOpen(true);
      requestAnimationFrame(() => findInputRef.current?.select());
      return;
    }
    if (completions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCompletionIndex(i => (i + 1) % completions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCompletionIndex(i => (i - 1 + completions.length) % completions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptCompletion(completions[completionIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeCompletions(); return; }
    }
    if (e.key === 'Escape' && findOpen) { setFindOpen(false); return; }
  }, [completions, completionIndex, acceptCompletion, closeCompletions, findOpen]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    
    if (top + e.currentTarget.clientHeight > contentHeight - 500) {
      setRenderLimit(prev => prev + 2000);
    }

    // Use a faster update for the gutter offset
    setVirtualScrollTop(top);

    requestAnimationFrame(() => {
      setScrollTop(top);
      if (gutterRef.current) {
        gutterRef.current.scrollTop = top;
      }
    });
    closeCompletions();
  }, [closeCompletions, contentHeight]);

  const visibleGutterRange = useMemo(() => {
    if (rowLayout.tops.length === 0) return { start: 0, end: displayToSource.length };
    
    const start = rowLayout.tops.findIndex(top => top > virtualScrollTop - LINE_HEIGHT * 10);
    const end = rowLayout.tops.findIndex(top => top > virtualScrollTop + 1200);
    
    return {
      start: start === -1 ? 0 : Math.max(0, start - 2),
      end: end === -1 ? displayToSource.length : Math.min(displayToSource.length, end + 2)
    };
  }, [virtualScrollTop, rowLayout.tops, displayToSource.length]);

  const visibleLines = useMemo(() => {
    if (rowLayout.tops.length === 0) return [];
    
    const { start, end } = visibleGutterRange;
    return displayToSource.slice(start, end).map((src, i) => ({
      src,
      row: i + start
    }));
  }, [displayToSource, visibleGutterRange, rowLayout.tops]);
  const foldRows = useMemo(() => {
    const rows: { top: number; start: number; collapsed: boolean }[] = [];
    for (let row = visibleGutterRange.start; row < visibleGutterRange.end; row++) {
      const src = displayToSource[row];
      if (structure.regions.has(src)) {
        rows.push({ top: rowTop(row), start: src, collapsed: folded.has(src) });
      }
    }
    return rows;
  }, [displayToSource, structure, folded, rowTop, visibleGutterRange]);

  // Indent guides: one thin, depth-colored vertical rule per nesting level on each
  // visible row. Skipped on very large files to keep per-keystroke work bounded.
  const showGuides = displayToSource.length <= GUIDE_LINE_LIMIT;
  const guides = useMemo(() => {
    if (!showGuides) return null;
    const bars: React.ReactNode[] = [];
    for (let row = visibleGutterRange.start; row < visibleGutterRange.end; row++) {
      const src = displayToSource[row];
      const depth = structure.guideDepth[src] || 0;
      
      const top = rowTop(row) - EDITOR_PADDING;
      const height = rowHeight(row);
      
      for (let lvl = 0; lvl < depth; lvl++) {
        bars.push(
          <span
            key={`${row}-${lvl}`}
            className="absolute w-px"
            style={{
              top,
              left: `${lvl * 2}ch`,
              height: height,
              background: getNestColor(lvl),
              opacity: 0.4,
              zIndex: 0,
            }}
          />
        );
      }
    }
    return bars;
  }, [displayToSource, structure, showGuides, rowTop, rowHeight, visibleGutterRange]);

  if (!isActive) return null;

  return (
    <div className="flex flex-col h-full bg-[#020617] overflow-hidden">
      <div
        className={`h-10 px-6 flex items-center justify-between border-b shrink-0 transition-colors ${
          hasErrors ? 'bg-red-950/50 border-red-500/50' : 'bg-zinc-950/40 border-zinc-800/40'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-tighter">
            {isReadOnly ? 'PROTECTED_BUNDLE' : 'EDITABLE_JS_MODULE'}
          </span>
          <div className="w-1 h-1 rounded-full bg-zinc-800" />
          <span className={`text-[9px] font-mono uppercase font-bold ${hasErrors ? 'text-red-400' : color}`}>{title}</span>
          {hasErrors && (
            <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-red-400">
              <AlertCircle size={11} />
              {errorCount} error{errorCount > 1 ? 's' : ''} · line {validation.errors[0].line}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setFindOpen(true); requestAnimationFrame(() => findInputRef.current?.select()); }}
            className="flex items-center space-x-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Find (Ctrl+F)"
          >
            <Search size={10} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Find</span>
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(safeValue)}
            className="flex items-center space-x-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Copy size={10} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Copy Code</span>
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {findOpen && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg px-2 py-1">
            <Search size={12} className="text-zinc-500" />
            <input
              ref={findInputRef}
              value={findQuery}
              onChange={(e) => setFindQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); selectMatch(findIndex + (e.shiftKey ? -1 : 1)); }
                if (e.key === 'Escape') { e.preventDefault(); setFindOpen(false); }
              }}
              placeholder="Find in file"
              className="bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none w-40 font-mono"
            />
            <span className="text-[10px] font-mono text-zinc-500 tabular-nums min-w-[44px] text-center">
              {matches.length ? `${findIndex + 1}/${matches.length}` : '0/0'}
            </span>
            <button onClick={() => selectMatch(findIndex - 1)} className="text-zinc-500 hover:text-white p-0.5" title="Previous (Shift+Enter)">
              <ChevronUp size={13} />
            </button>
            <button onClick={() => selectMatch(findIndex + 1)} className="text-zinc-500 hover:text-white p-0.5" title="Next (Enter)">
              <ChevronDown size={13} />
            </button>
            <button onClick={() => setFindOpen(false)} className="text-zinc-500 hover:text-white p-0.5" title="Close (Esc)">
              <X size={13} />
            </button>
          </div>
        )}
        <div
          ref={gutterRef}
          className="w-12 bg-zinc-950/20 border-r border-zinc-800/30 text-[10px] font-mono text-white select-none shrink-0 overflow-hidden text-center relative"
        >
          {/* Numbers are absolutely positioned at each row's measured top so they
              stay aligned when a line soft-wraps to several visual rows. The inner
              box carries the full content height so gutter scroll tracks the editor. */}
          <div className="relative" style={{ height: contentHeight }}>
            {displayToSource.slice(visibleGutterRange.start, visibleGutterRange.end).map((src, i) => {
              const row = i + visibleGutterRange.start;
              return (
                <div key={row} className="absolute left-0 right-0 leading-7" style={{ top: rowTop(row) }}>
                  {src + 1}
                </div>
              );
            })}
            {foldRows.map(({ top, start, collapsed }) => (
              <button
                key={start}
                onClick={() => toggleFold(start)}
                style={{ top, height: LINE_HEIGHT }}
                className="absolute right-0 flex items-center justify-center w-4 text-zinc-600 hover:text-orange-400 transition-colors"
                title={collapsed ? 'Expand region' : 'Collapse region'}
              >
                {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
            ))}
          </div>
        </div>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onKeyUp={refreshCompletions}
          onClick={closeCompletions}
          className="flex-1 min-w-0 overflow-auto custom-scrollbar relative"
        >
          {guides && (
            <div
              className="atlas-code-guides absolute pointer-events-none z-0"
              style={{ top: EDITOR_PADDING, left: EDITOR_PADDING }}
            >
              {guides}
            </div>
          )}
            <Editor
              value={displayValue}
              onValueChange={(code) => { applyDisplayChange(code); requestAnimationFrame(refreshCompletions); }}
              highlight={highlightWithJs}
              padding={EDITOR_PADDING}
              className="atlas-code-editor relative z-10 bg-transparent text-[13px] font-mono focus:outline-none resize-none leading-7 min-h-full outline-none"
              readOnly={isReadOnly}
              style={editorStyle}
            />
          {completions.length > 0 && completionPos && (
            <div
              className="absolute z-30 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-hidden text-xs font-mono min-w-[140px]"
              style={{ top: completionPos.top, left: completionPos.left }}
            >
              {completions.map((c, i) => (
                <button
                  key={c}
                  onMouseDown={(e) => { e.preventDefault(); acceptCompletion(c); }}
                  onMouseEnter={() => setCompletionIndex(i)}
                  className={`w-full text-left px-3 py-1 transition-colors ${
                    i === completionIndex ? 'bg-orange-500/20 text-orange-200' : 'text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeBuffer;
