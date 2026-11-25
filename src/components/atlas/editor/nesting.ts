import { syntaxTree } from '@codemirror/language';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';

// Nesting aids for the JS editor: depth-coloured brackets, AID-global
// highlighting, the enclosing-block guide and the scope breadcrumb.
//
// Performance contract — the reason this is hand-rolled rather than a regex
// pass: everything here reads the incremental Lezer tree CodeMirror already
// maintains, and decorates only `view.visibleRanges`. Work per update is
// proportional to what is on screen, not to file size, so a ~300 KB Library
// costs the same as a 30-line Input modifier.

const OPEN = new Set(['(', '[', '{', 'InterpolationStart']);
const CLOSE = new Set([')', ']', '}', 'InterpolationEnd']);
export const BRACKET_COLORS = 6;

/** A node counts as one nesting level if it directly contains an opening bracket. */
function isBracketed(node: SyntaxNode): boolean {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (OPEN.has(c.name)) return true;
  }
  return false;
}

/** Nesting depth of the bracket pair a bracket token belongs to (outermost = 0). */
function bracketDepth(token: SyntaxNode): number {
  let depth = 0;
  for (let a = token.parent?.parent; a; a = a.parent) {
    if (isBracketed(a)) depth++;
  }
  return depth;
}

/** Depth of the bracket token starting at `pos`, or null if there is none. For tests/tools. */
export function bracketDepthAt(state: EditorState, pos: number): number | null {
  const node = syntaxTree(state).resolveInner(pos, 1);
  return OPEN.has(node.name) || CLOSE.has(node.name) ? bracketDepth(node) : null;
}

const depthMarks = Array.from({ length: BRACKET_COLORS }, (_, i) =>
  Decoration.mark({ class: `cm-bracket-d${i}` }),
);
const globalMark = Decoration.mark({ class: 'cm-aid-global' });

function buildMarks(view: EditorView, globals: Set<string>): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const tree = syntaxTree(view.state);
  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter: node => {
        const name = node.name;
        if (OPEN.has(name) || CLOSE.has(name)) {
          const depth = bracketDepth(node.node);
          builder.add(node.from, node.to, depthMarks[depth % BRACKET_COLORS]);
          return false;
        }
        if (name === 'VariableName' && node.to - node.from <= 20) {
          const word = view.state.doc.sliceString(node.from, node.to);
          if (globals.has(word)) builder.add(node.from, node.to, globalMark);
          return false;
        }
        return undefined;
      },
    });
  }
  return builder.finish();
}

/** Rainbow brackets + AID-global highlighting, visible ranges only. */
export function nestingMarks(globals: readonly string[]) {
  const set = new Set(globals);
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildMarks(view, set);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) {
          this.decorations = buildMarks(u.view, set);
        }
      }
    },
    { decorations: v => v.decorations },
  );
}

// ------------------------------------------------------------------ scopes

/** Node types that form a block worth guiding/naming. */
const BLOCKS = new Set(['Block', 'ObjectExpression', 'ArrayExpression', 'ClassBody', 'SwitchBody', 'ArgList']);

export interface ScopeCrumb {
  label: string;
  /** Where clicking the crumb jumps to (the scope's start). */
  pos: number;
  kind: 'function' | 'class' | 'control' | 'object' | 'array' | 'call';
}

const text = (state: EditorState, n: SyntaxNode | null | undefined) =>
  n ? state.doc.sliceString(n.from, Math.min(n.to, n.from + 40)) : '';

/** Name a function-ish node from its definition or the variable/property it's assigned to. */
function functionName(state: EditorState, n: SyntaxNode): string {
  const def = n.getChild('VariableDefinition') ?? n.getChild('PropertyDefinition');
  if (def) return text(state, def);
  const p = n.parent;
  if (p?.name === 'VariableDeclaration') {
    // `const foo = () => …` — the VariableDefinition precedes the arrow.
    let c = n.prevSibling;
    while (c && c.name !== 'VariableDefinition') c = c.prevSibling;
    if (c) return text(state, c);
  }
  if (p?.name === 'Property') return text(state, p.getChild('PropertyDefinition'));
  if (p?.name === 'ArgList') {
    const callee = p.parent?.firstChild;
    return `${text(state, callee).replace(/\s+/g, '')} callback`;
  }
  return 'anonymous';
}

function crumbFor(state: EditorState, n: SyntaxNode): ScopeCrumb | null {
  switch (n.name) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunction':
      return { label: `${functionName(state, n)}()`, pos: n.from, kind: 'function' };
    case 'MethodDeclaration':
      return { label: `${text(state, n.getChild('PropertyDefinition'))}()`, pos: n.from, kind: 'function' };
    case 'ClassDeclaration':
    case 'ClassExpression':
      return { label: `class ${text(state, n.getChild('VariableDefinition'))}`.trim(), pos: n.from, kind: 'class' };
    case 'IfStatement':
      return { label: 'if', pos: n.from, kind: 'control' };
    case 'ForStatement':
      return { label: 'for', pos: n.from, kind: 'control' };
    case 'WhileStatement':
      return { label: 'while', pos: n.from, kind: 'control' };
    case 'DoStatement':
      return { label: 'do', pos: n.from, kind: 'control' };
    case 'SwitchStatement':
      return { label: 'switch', pos: n.from, kind: 'control' };
    case 'TryStatement':
      return { label: 'try', pos: n.from, kind: 'control' };
    case 'CatchClause':
      return { label: 'catch', pos: n.from, kind: 'control' };
    case 'ObjectExpression': {
      const p = n.parent;
      const key = p?.name === 'Property' ? text(state, p.getChild('PropertyDefinition')) : '';
      return { label: key ? `${key}: {}` : '{}', pos: n.from, kind: 'object' };
    }
    case 'ArrayExpression':
      return { label: '[]', pos: n.from, kind: 'array' };
    default:
      return null;
  }
}

/** Enclosing scopes at `pos`, outermost first. Walks ancestors only — O(depth). */
export function scopePath(state: EditorState, pos: number): ScopeCrumb[] {
  const crumbs: ScopeCrumb[] = [];
  for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1); n; n = n.parent) {
    const c = crumbFor(state, n);
    if (c) crumbs.push(c);
  }
  return crumbs.reverse();
}

/** The innermost block-like node (with brackets) around `pos`. */
function innermostBlock(state: EditorState, pos: number): SyntaxNode | null {
  for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(pos, -1); n; n = n.parent) {
    if (BLOCKS.has(n.name) && n.to - n.from > 1) return n;
  }
  return null;
}

const scopeLine = Decoration.line({ class: 'cm-scope-line' });
const scopeEdge = Decoration.mark({ class: 'cm-scope-bracket' });

function buildScope(view: EditorView): DecorationSet {
  const block = innermostBlock(view.state, view.state.selection.main.head);
  if (!block) return Decoration.none;
  const doc = view.state.doc;
  const first = doc.lineAt(block.from).number;
  const last = doc.lineAt(block.to).number;
  const builder = new RangeSetBuilder<Decoration>();
  // A one-line block needs no guide; still emphasise its brackets.
  const lines = last > first;
  const openEnd = block.from + 1;
  for (const { from, to } of view.visibleRanges) {
    const startLine = Math.max(first, doc.lineAt(from).number);
    const endLine = Math.min(last, doc.lineAt(to).number);
    for (let l = startLine; l <= endLine; l++) {
      const line = doc.line(l);
      if (lines) builder.add(line.from, line.from, scopeLine);
      if (l === first && block.from >= line.from) builder.add(block.from, openEnd, scopeEdge);
      if (l === last && block.to - 1 >= line.from && block.to - 1 > block.from) {
        builder.add(block.to - 1, block.to, scopeEdge);
      }
    }
  }
  return builder.finish();
}

/** Guide bar + emphasised brackets for the block the cursor is in. */
export const enclosingScope = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildScope(view);
    }
    update(u: ViewUpdate) {
      if (u.selectionSet || u.docChanged || u.viewportChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) {
        this.decorations = buildScope(u.view);
      }
    }
  },
  { decorations: v => v.decorations },
);

/**
 * Report the scope path to React when it changes. Batched to one call per
 * animation frame and skipped when the path is unchanged, so moving the cursor
 * inside one function never re-renders the editor chrome.
 */
export function scopeListener(
  onChange: (crumbs: ScopeCrumb[]) => void,
  /** Cursor line/column (1-based) and line count, for a status bar. */
  onCursor?: (pos: { line: number; column: number; lines: number }) => void,
) {
  let frame = 0;
  let lastKey = '';
  let lastCursor = '';
  return EditorView.updateListener.of(u => {
    if (!u.selectionSet && !u.docChanged && syntaxTree(u.startState) === syntaxTree(u.state)) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const state = u.view.state;
      const head = state.selection.main.head;
      const crumbs = scopePath(state, head);
      const key = crumbs.map(c => `${c.label}@${c.pos}`).join('|');
      if (key !== lastKey) {
        lastKey = key;
        onChange(crumbs);
      }
      if (onCursor) {
        const line = state.doc.lineAt(head);
        const cursor = { line: line.number, column: head - line.from + 1, lines: state.doc.lines };
        const ck = `${cursor.line}:${cursor.column}:${cursor.lines}`;
        if (ck !== lastCursor) {
          lastCursor = ck;
          onCursor(cursor);
        }
      }
    });
  });
}
