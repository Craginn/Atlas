import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { openSearchPanel, searchKeymap, SearchQuery, setSearchQuery } from '@codemirror/search';
import {
  EditorView, Decoration, type DecorationSet, WidgetType, keymap, lineNumbers, ViewPlugin,
  highlightActiveLine, highlightActiveLineGutter,
} from '@codemirror/view';
import { RangeSet, StateEffect, StateField, type Text } from '@codemirror/state';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { Copy, Search, AlertCircle, ChevronRight, ChevronLeft, CheckCircle2, Check } from 'lucide-react';
import { validateScriptSyntax, AID_GLOBALS } from '@/services/offlineSimulationService';
import { atlasTheme } from './codeEditorTheme';
import { enclosingScope, nestingMarks, scopeListener, type ScopeCrumb } from './editor/nesting';

// CodeMirror 6 editor: rendering is viewport-based, so only the visible lines
// are laid out no matter how large the file gets. Every extension added here
// keeps to that rule — the nesting aids (editor/nesting.ts) decorate visible
// ranges only, and the two whole-document jobs (syntax validation and the
// autocomplete identifier scan) are debounced/cached rather than run per
// keystroke. The props contract is unchanged.

// The words the autocomplete always knows about, independent of what's typed:
// the AID scripting globals plus JS keywords. Code-local identifiers are mixed
// in at suggest time (see aidCompletionSource) so "fill-ins" match nearby usage.
const JS_KEYWORDS = [
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do',
  'switch', 'case', 'default', 'break', 'continue', 'typeof', 'instanceof', 'new',
  'try', 'catch', 'finally', 'throw', 'class', 'extends', 'super', 'this', 'null',
  'undefined', 'true', 'false', 'async', 'await', 'of', 'in', 'delete', 'void',
  'yield', 'JSON', 'Object', 'Array', 'Math', 'String', 'Number', 'Boolean',
  'console', 'push', 'pop', 'slice', 'splice', 'map', 'filter', 'forEach',
  'includes', 'indexOf', 'length', 'toString', 'stringify', 'parse',
];

// Scanning the whole document for identifiers is O(file size) — ~300 KB for a
// Library — and completion runs on every typed character, so the full scan is
// cached and refreshed at most every few seconds. Names typed since then still
// complete, from the window around the cursor, which is rescanned each time.
const LOCAL_SCAN_MS = 3000;
const NEAR_CURSOR = 4000;
const IDENT = /[A-Za-z_$][\w$]*/g;
let identifierCache: { at: number; length: number; words: Set<string> } | null = null;

const localIdentifiers = (doc: Text, pos: number): string[] => {
  const now = Date.now();
  if (
    !identifierCache ||
    now - identifierCache.at > LOCAL_SCAN_MS ||
    Math.abs(identifierCache.length - doc.length) > 2000
  ) {
    identifierCache = { at: now, length: doc.length, words: new Set(doc.toString().match(IDENT) || []) };
  }
  const near = doc.sliceString(Math.max(0, pos - NEAR_CURSOR), Math.min(doc.length, pos + NEAR_CURSOR));
  return [...identifierCache.words, ...(near.match(IDENT) || [])];
};

// Rank + filter the completion dictionary against the partial word. Code-local
// identifiers are folded in so the suggestions bias toward names the script
// already uses.
const aidCompletionSource: CompletionSource = (context) => {
  const word = context.matchBefore(/[\w$]+/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const local = localIdentifiers(context.state.doc, context.pos);
  const dict = new Set<string>([...AID_GLOBALS, ...JS_KEYWORDS, ...local]);
  const lower = word.text.toLowerCase();
  return {
    from: word.from,
    options: Array.from(dict)
      .filter(w => w !== word.text && w.toLowerCase().startsWith(lower))
      // Shorter, closer matches first; then alphabetical for stability.
      .sort((a, b) => a.length - b.length || a.localeCompare(b))
      .slice(0, 20)
      .map(label => ({
        label,
        type: JS_KEYWORDS.includes(label) ? 'keyword' : AID_GLOBALS.includes(label) ? 'variable' : 'text',
      })),
  };
};

interface CodeBufferProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  color: string;
  id: string;
  isReadOnly?: boolean;
  isActive: boolean;
  // An external request (e.g. from the Code Explorer's cross-file search) to open
  // the find panel pre-filled with a query. `nonce` changes on each request so
  // re-searching the same term still re-triggers.
  findRequest?: { query: string; nonce: number } | null;
  runtimeErrors?: MarkedError[];
  /**
   * Put the cursor on this line (and column) and flash it — "go to line" from
   * the debugger panels. `nonce` changes per request so the same line re-jumps.
   */
  jumpRequest?: { line: number; column?: number; nonce: number } | null;
  /** One line about what this script is for, shown beside its name. */
  subtitle?: string;
  /** On narrow screens: a "Files" button back to the script list. */
  onShowFiles?: () => void;
}

/** An error to mark in the editor. `column` (1-based) adds an underline at the exact spot. */
export interface MarkedError {
  line: number;
  column?: number;
  message: string;
  /** Short plain-language headline shown in the header bar. */
  title?: string;
}

const setRuntimeErrors = StateEffect.define<MarkedError[]>();

const runtimeErrorField = StateField.define<MarkedError[]>({
  create() { return []; },
  update(errors, tr) {
    for (const e of tr.effects) {
      if (e.is(setRuntimeErrors)) return e.value;
    }
    return errors;
  },
});

/** The identifier (or single character) starting at `pos`, for the underline. */
function tokenRange(view: EditorView, pos: number, lineEnd: number): { from: number; to: number } {
  const rest = view.state.doc.sliceString(pos, lineEnd);
  const word = /^[\w$]+/.exec(rest);
  return { from: pos, to: Math.min(lineEnd, pos + Math.max(1, word ? word[0].length : 1)) };
}

function buildDecoSet(view: EditorView, errors: MarkedError[]): RangeSet<Decoration> {
  if (!errors.length) return RangeSet.empty;
  const ranges = [];
  const seenLines = new Set<number>();
  for (const e of errors) {
    if (e.line < 1 || e.line > view.state.doc.lines) continue;
    const lineHandle = view.state.doc.line(e.line);
    if (!seenLines.has(e.line)) {
      seenLines.add(e.line);
      ranges.push(Decoration.line({ class: 'cm-runtime-error-line' }).range(lineHandle.from));
      ranges.push(Decoration.widget({ widget: new GutterErrorWidget(e.line, e.title ?? e.message), side: 1 }).range(lineHandle.from));
    }
    if (e.column && e.column > 0 && lineHandle.length > 0) {
      const pos = Math.min(lineHandle.to, lineHandle.from + e.column - 1);
      const { from, to } = tokenRange(view, pos, lineHandle.to);
      if (to > from) {
        ranges.push(Decoration.mark({ class: 'cm-error-mark', attributes: { title: e.title ?? e.message } }).range(from, to));
      }
    }
  }
  return RangeSet.of(ranges, true);
}

// ── "Go to line" flash ──────────────────────────────────────────────────────
const setFlash = StateEffect.define<number | null>();
const flashField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setFlash)) {
        return e.value === null ? Decoration.none : Decoration.set([Decoration.line({ class: 'cm-jump-flash' }).range(e.value)]);
      }
    }
    return tr.docChanged ? deco.map(tr.changes) : deco;
  },
  provide: f => EditorView.decorations.from(f),
});

const errorDecorationPlugin = ViewPlugin.fromClass(class {
  decorations;
  constructor(view) {
    this.decorations = buildDecoSet(view, []);
  }
  update(update) {
    const errors = update.state.field(runtimeErrorField);
    // Only rebuild when the error list or the document changed.
    if (update.docChanged || errors !== update.startState.field(runtimeErrorField)) {
      this.decorations = buildDecoSet(update.view, errors);
    }
  }
}, {
  decorations: v => v.decorations,
});

class GutterErrorWidget extends WidgetType {
  constructor(private line: number, private message: string) { super(); }
  eq(other: GutterErrorWidget) { return other.line === this.line && other.message === this.message; }
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-gutter-error-dot';
    el.title = `Line ${this.line}: ${this.message}`;
    el.textContent = '●';
    return el;
  }
  ignoreEvent() { return false; }
}

const CodeBuffer: React.FC<CodeBufferProps> = ({ title, value, onChange, isReadOnly = false, isActive, findRequest, runtimeErrors, jumpRequest, subtitle, onShowFiles }) => {
  const safeValue = value || '';
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  // The view is created after the first effects run, so anything dispatched on mount must wait for it.
  const [editorReady, setEditorReady] = useState(false);
  const [scope, setScope] = useState<ScopeCrumb[]>([]);
  const [cursor, setCursor] = useState({ line: 1, column: 1, lines: 0 });
  const [copied, setCopied] = useState(false);

  // ── Validation (drives the red bar) ────────────────────────────────────────
  // A full parse of the script, so it waits for a pause in typing instead of
  // running per keystroke — on a ~300 KB Library that is the difference between
  // smooth typing and dropped frames.
  const validatedValue = useDebouncedValue(safeValue, VALIDATE_DELAY_MS);
  const validation = useMemo(
    () => validateScriptSyntax(validatedValue, title !== 'Library'),
    [validatedValue, title]
  );
  // The header names the first problem: a syntax error now, else the last
  // run's error in this script.
  const syntaxError = validation.errors[0];
  const firstError: MarkedError | undefined = syntaxError
    ? { line: syntaxError.line, column: syntaxError.column, message: syntaxError.message }
    : runtimeErrors?.[0];
  const hasErrors = Boolean(firstError);

  // Editor plumbing. The extension set is static — no per-keystroke measurement
  // or whole-document re-highlight.
  const extensions = useMemo(() => [
    atlasTheme,
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    javascript(),
    EditorView.lineWrapping,
    history(),
    foldGutter(),
    indentOnInput(),
    bracketMatching({ afterCursor: true }),
    closeBrackets(),
    // Nesting aids — all viewport-limited (see editor/nesting.ts).
    nestingMarks(AID_GLOBALS),
    enclosingScope,
    indentationMarkers({
      markerType: 'codeOnly',
      thickness: 1,
      colors: {
        dark: 'rgba(255,255,255,0.07)',
        activeDark: 'rgba(130,170,255,0.45)',
        light: 'rgba(0,0,0,0.1)',
        activeLight: 'rgba(0,0,0,0.3)',
      },
    }),
    scopeListener(setScope, setCursor),
    autocompletion({ override: [aidCompletionSource], activateOnTyping: true }),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
    ]),
    runtimeErrorField,
    errorDecorationPlugin,
    flashField,
  ], []);

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
  }, [onChange]);

  const openFind = useCallback(() => {
    const view = cmRef.current?.view;
    if (view) openSearchPanel(view);
  }, []);

  // Honor an external find request (from the Explorer's cross-file search):
  // open the search panel pre-filled with the query. openSearchPanel focuses
  // the panel input, matching the old jump behavior.
  useEffect(() => {
    if (!findRequest?.query) return;
    const view = cmRef.current?.view;
    if (!view) return;
    openSearchPanel(view);
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: findRequest.query })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findRequest?.nonce]);

  const jumpToPos = useCallback((pos: number) => {
    const view = cmRef.current?.view;
    if (!view) return;
    view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
    view.focus();
  }, []);

  /** Cursor to `line`:`column` (or the line's first code character), centred and flashed. */
  const jumpToLine = useCallback((line: number, column?: number) => {
    const view = cmRef.current?.view;
    if (!view || line < 1 || line > view.state.doc.lines) return;
    const l = view.state.doc.line(line);
    const indent = l.text.length - l.text.trimStart().length;
    const pos = Math.min(l.to, l.from + (column && column > 0 ? column - 1 : indent));
    view.dispatch({
      selection: { anchor: pos },
      effects: [EditorView.scrollIntoView(pos, { y: 'center' }), setFlash.of(l.from)],
    });
    view.focus();
    window.setTimeout(() => view.dispatch({ effects: setFlash.of(null) }), 1600);
  }, []);

  // "Go to line" from another panel. Waits for the editor to exist, so a jump
  // that also switched files/views still lands.
  useEffect(() => {
    if (!jumpRequest || !editorReady || !isActive) return;
    // Let the new document render before measuring where to scroll.
    const id = requestAnimationFrame(() => jumpToLine(jumpRequest.line, jumpRequest.column));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpRequest?.nonce, editorReady, isActive]);

  useEffect(() => {
    const view = cmRef.current?.view;
    if (!view) return;
    view.dispatch({
      effects: setRuntimeErrors.of([
        ...(runtimeErrors ?? []),
        ...validation.errors.map(e => ({ line: e.line, column: e.column, message: e.message })),
      ]),
    });
  }, [runtimeErrors, validation, editorReady]);

  if (!isActive) return null;

  const copy = () => {
    void navigator.clipboard.writeText(safeValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  const problemCount = (runtimeErrors?.length ?? 0) + validation.errors.length;

  return (
    <div className="flex flex-col h-full bg-[#020617] overflow-hidden">
      {/* One header: what this script is, whether it has problems, and the two actions. */}
      <div className="h-11 px-4 flex items-center gap-3 border-b border-zinc-800/60 bg-[#060912] shrink-0 min-w-0">
        {onShowFiles && (
          <button
            onClick={onShowFiles}
            className="flex items-center gap-1 -ml-1.5 px-1.5 py-1 rounded text-xs text-zinc-400 hover:text-white hover:bg-white/5 shrink-0"
          >
            <ChevronLeft size={14} /> Files
          </button>
        )}
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-100 shrink-0">{title}</span>
          {subtitle && <span className="text-xs text-zinc-500 truncate hidden sm:inline">{subtitle}</span>}
          {isReadOnly && <span className="text-[11px] px-1.5 rounded bg-zinc-800 text-zinc-400 shrink-0">read-only</span>}
        </div>

        <div className="ml-auto flex items-center gap-1 shrink-0 min-w-0">
          {firstError ? (
            <button
              onClick={() => jumpToLine(firstError.line, firstError.column)}
              title={`${firstError.message}
Click to go to the line.`}
              className="flex items-center gap-1.5 min-w-0 max-w-[26rem] px-2 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-200 hover:bg-red-500/20 transition-colors"
            >
              <AlertCircle size={13} className="shrink-0 text-red-400" />
              <span className="truncate">
                {firstError.line > 0 ? `Line ${firstError.line}: ` : ''}
                {(firstError.title ?? firstError.message).replace(/`/g, '')}
              </span>
              {problemCount > 1 && <span className="shrink-0 text-red-300/70">+{problemCount - 1}</span>}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-1 text-xs text-emerald-400/80" title="No syntax errors, and no errors from the last run">
              <CheckCircle2 size={13} /> No problems
            </span>
          )}
          <button
            onClick={openFind}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
            title="Find and replace (Ctrl+F)"
          >
            <Search size={13} /> <span className="hidden md:inline">Find</span>
          </button>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
            title="Copy the whole script"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeMirror
          ref={cmRef}
          onCreateEditor={() => setEditorReady(true)}
          value={safeValue}
          onChange={handleChange}
          extensions={extensions}
          theme="none"
          basicSetup={false}
          editable={!isReadOnly}
          readOnly={isReadOnly}
          className="atlas-code-editor h-full"
        />
      </div>

      <StatusBar scope={scope} cursor={cursor} onJump={jumpToPos} />
    </div>
  );
};

const VALIDATE_DELAY_MS = 350;

/** `value`, but only after it has stopped changing for `delay` ms. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return settled;
}

const CRUMB_COLORS: Record<ScopeCrumb['kind'], string> = {
  function: 'text-[#82aaff]',
  class: 'text-[#56d4dd]',
  control: 'text-[#f97583]',
  object: 'text-[#f07178]',
  array: 'text-[#ffcb6b]',
  call: 'text-[#82aaff]',
};

/**
 * Bottom status bar: where the cursor is structurally (the chain of enclosing
 * functions, control blocks and objects — click one to jump to it) and where
 * it is by line and column.
 */
const StatusBar: React.FC<{
  scope: ScopeCrumb[];
  cursor: { line: number; column: number; lines: number };
  onJump: (pos: number) => void;
}> = ({ scope, cursor, onJump }) => (
  <div className="h-7 px-3 flex items-center gap-1 border-t border-zinc-800/60 bg-[#060912] shrink-0 whitespace-nowrap text-[11px] font-mono">
    <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto custom-scrollbar">
      {scope.length === 0 ? (
        <span className="text-zinc-600">top level</span>
      ) : (
        scope.map((c, i) => (
          <React.Fragment key={`${c.pos}-${i}`}>
            {i > 0 && <ChevronRight size={11} className="text-zinc-700 shrink-0" />}
            <button
              onClick={() => onJump(c.pos)}
              className={`${CRUMB_COLORS[c.kind]} hover:underline shrink-0 max-w-[16rem] truncate`}
              title={`Jump to ${c.label}`}
            >
              {c.label}
            </button>
          </React.Fragment>
        ))
      )}
    </div>
    <span className="shrink-0 pl-3 text-zinc-500 tabular-nums">
      Ln {cursor.line}, Col {cursor.column}
      {cursor.lines > 0 && <span className="text-zinc-600"> · {cursor.lines} lines</span>}
    </span>
  </div>
);

export default CodeBuffer;
