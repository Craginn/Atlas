import { parse as acornParse } from 'acorn';
import { BlockNode, BlockProgram, makeBlock } from './types';

// JavaScript source → blocks.
//
// Statements become structural blocks; every expression is captured as its
// exact source slice (see types.ts for why). Node types we don't model fall
// through to a `raw` block carrying verbatim source, so this never loses code.

interface AcornNode {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
}

interface Comment {
  start: number;
  end: number;
  text: string;
}

/**
 * Comments collected during the parse, in source order.
 *
 * Acorn drops comments from the AST entirely. Without capturing them here, a
 * round-trip through the canvas would silently strip every comment from the
 * user's file — the single most damaging thing this feature could do to a
 * heavily-annotated script. They're reattached as leading trivia per statement.
 */
let comments: Comment[] = [];

export function parseCode(source: string): BlockProgram {
  if (!source.trim()) return { roots: [] };

  let ast: AcornNode;
  comments = [];
  verbatimRanges = [];
  try {
    ast = acornParse(source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      allowReturnOutsideFunction: true, // AID modifiers `return { text }` at top level
      allowAwaitOutsideFunction: true,
      locations: true,
      onComment: (isBlock, _text, start, end) => {
        // Store the full original slice (delimiters included) so `//` vs `/* */`
        // and any internal formatting survive verbatim. The comment token starts
        // at `//`, so pull in the line's own indentation too — otherwise a
        // commented-out code block loses all its relative alignment.
        const lineStart = source.lastIndexOf('\n', start - 1) + 1;
        const indent = source.slice(lineStart, start);
        const prefix = /^[ \t]*$/.test(indent) ? indent : '';
        comments.push({ start, end, text: prefix + source.slice(start, end) });
      },
    }) as unknown as AcornNode;
  } catch (err) {
    // A syntax error means we can't structure anything — but the user's code is
    // still theirs. Preserve it whole in one raw block and report the error
    // rather than silently showing an empty canvas.
    const e = err as Error & { loc?: { line: number } };
    return {
      roots: [makeBlock('raw', { source })],
      parseError: { message: e.message, line: e.loc?.line ?? 0 },
    };
  }

  commentCursor = 0;
  const body = (ast.body as AcornNode[]) ?? [];
  const roots = body.map(node => statementToBlock(node, source));

  // Trailing comments after the last statement have no owner — park them on a
  // raw block so they aren't dropped.
  if (commentCursor < comments.length) {
    const rest = comments.slice(commentCursor).map(c => c.text).join('\n');
    roots.push(makeBlock('raw', { source: rest }));
  }
  return { roots };
}

/**
 * Source ranges emitted verbatim (expression slices, raw blocks).
 *
 * Any comment inside one of these is already carried along inside the slice.
 * Without tracking them, such a comment would *also* be claimed as leading
 * trivia by the following statement and emitted a second time — which is how a
 * top-level `const f = () => { ...comments... }` duplicated its whole comment
 * body on every round-trip.
 */
let verbatimRanges: Array<[number, number]> = [];

function markVerbatim(start: number, end: number): void {
  verbatimRanges.push([start, end]);
}

function insideVerbatim(pos: number): boolean {
  return verbatimRanges.some(([s, e]) => pos >= s && pos < e);
}

/** Verbatim source for a node — the mechanism that makes round-trips lossless. */
function slice(node: AcornNode, source: string): string {
  markVerbatim(node.start, node.end);
  return source.slice(node.start, node.end);
}

/** An expression's source, or '' when absent (e.g. a bare `return;`). */
function expr(node: unknown, source: string): string {
  if (!node) return '';
  return slice(node as AcornNode, source);
}

/**
 * Statement list for a body position. A body may be a BlockStatement (`{...}`)
 * or a single unbraced statement (`if (x) doThing();`) — normalize both to a
 * list so slots are uniform.
 */
function bodyToBlocks(node: unknown, source: string): BlockNode[] {
  if (!node) return [];
  const n = node as AcornNode;
  if (n.type === 'BlockStatement') {
    return ((n.body as AcornNode[]) ?? []).map(s => statementToBlock(s, source));
  }
  return [statementToBlock(n, source)];
}

/** How far through `comments` we've consumed, so none is attached twice. */
let commentCursor = 0;

/**
 * Build a block, first claiming any comments and blank lines that sit above it.
 *
 * Traversal is depth-first, which for statements is also source order, so a
 * single forward cursor is enough to hand each comment to the statement it
 * annotates.
 */
function statementToBlock(node: AcornNode, source: string): BlockNode {
  const leading: string[] = [];
  while (commentCursor < comments.length && comments[commentCursor].end <= node.start) {
    const c = comments[commentCursor];
    // Skip comments already carried inside an emitted verbatim slice; claiming
    // them here would emit them a second time.
    if (!insideVerbatim(c.start)) leading.push(c.text);
    commentCursor += 1;
  }

  // A blank line before this statement is authorial grouping — cheap to keep,
  // and its loss would reflow the whole file into an unreadable wall.
  const gapStart = leading.length
    ? comments[commentCursor - leading.length].start
    : node.start;
  const gap = source.slice(Math.max(0, gapStart - 200), gapStart);
  const blankBefore = /\n[ \t]*\n[ \t]*$/.test(gap);

  const block = buildStatement(node, source);
  if (leading.length) block.fields.leading = leading.join('\n');
  if (blankBefore) block.fields.blankBefore = 'true';
  return block;
}

function buildStatement(node: AcornNode, source: string): BlockNode {
  switch (node.type) {
    case 'VariableDeclaration': {
      const decls = (node.declarations as AcornNode[]) ?? [];
      // Keep the declarator list as one source slice so `let a = 1, b = 2`
      // survives intact instead of being split and re-joined.
      const first = decls[0];
      const last = decls[decls.length - 1];
      if (first && last) markVerbatim(first.start, last.end);
      const text = first && last ? source.slice(first.start, last.end) : '';
      return makeBlock('var', {
        declKind: String(node.kind ?? 'let'),
        declarations: text,
      });
    }

    case 'FunctionDeclaration': {
      const params = ((node.params as AcornNode[]) ?? [])
        .map(p => slice(p, source))
        .join(', ');
      return makeBlock(
        'function',
        {
          name: String((node.id as AcornNode | null)?.name ?? ''),
          params,
          async: String(Boolean(node.async)),
          generator: String(Boolean(node.generator)),
        },
        { body: bodyToBlocks(node.body, source) },
      );
    }

    case 'ReturnStatement':
      return makeBlock('return', { argument: expr(node.argument, source) });

    case 'ThrowStatement':
      return makeBlock('throw', { argument: expr(node.argument, source) });

    case 'ExpressionStatement':
      return makeBlock('expression', { expression: expr(node.expression, source) });

    case 'IfStatement': {
      // `else if` is an IfStatement in the alternate slot. Recursing keeps the
      // chain as nested If blocks, which is how a beginner reads it anyway.
      return makeBlock(
        'if',
        { test: expr(node.test, source) },
        {
          then: bodyToBlocks(node.consequent, source),
          else: bodyToBlocks(node.alternate, source),
        },
      );
    }

    case 'ForStatement':
      return makeBlock(
        'for',
        {
          // The init clause may be a declaration (which slices with a trailing
          // `;`) — strip it so we don't emit `for (let i = 0;; ...)`.
          init: expr(node.init, source).replace(/;$/, ''),
          test: expr(node.test, source),
          update: expr(node.update, source),
        },
        { body: bodyToBlocks(node.body, source) },
      );

    case 'ForOfStatement':
    case 'ForInStatement':
      return makeBlock(
        'forIn',
        {
          left: expr(node.left, source).replace(/;$/, ''),
          operator: node.type === 'ForOfStatement' ? 'of' : 'in',
          right: expr(node.right, source),
        },
        { body: bodyToBlocks(node.body, source) },
      );

    case 'WhileStatement':
      return makeBlock(
        'while',
        { test: expr(node.test, source) },
        { body: bodyToBlocks(node.body, source) },
      );

    case 'DoWhileStatement':
      return makeBlock(
        'doWhile',
        { test: expr(node.test, source) },
        { body: bodyToBlocks(node.body, source) },
      );

    case 'SwitchStatement':
      return makeBlock(
        'switch',
        { discriminant: expr(node.discriminant, source) },
        {
          cases: ((node.cases as AcornNode[]) ?? []).map(c =>
            makeBlock(
              'case',
              { test: expr(c.test, source) }, // absent test = `default:`
              {
                body: ((c.consequent as AcornNode[]) ?? []).map(s =>
                  statementToBlock(s, source),
                ),
              },
            ),
          ),
        },
      );

    case 'TryStatement': {
      const handler = node.handler as AcornNode | null;
      const finalizer = node.finalizer as AcornNode | null;
      return makeBlock(
        'try',
        {
          hasCatch: String(Boolean(handler)),
          // Optional catch binding: `catch {}` has a null param.
          catchParam: handler?.param ? expr(handler.param, source) : '',
          hasFinally: String(Boolean(finalizer)),
        },
        {
          body: bodyToBlocks(node.block, source),
          catch: handler ? bodyToBlocks(handler.body, source) : [],
          finally: finalizer ? bodyToBlocks(finalizer, source) : [],
        },
      );
    }

    case 'BreakStatement':
      return makeBlock('break', {
        label: String((node.label as AcornNode | null)?.name ?? ''),
      });

    case 'ContinueStatement':
      return makeBlock('continue', {
        label: String((node.label as AcornNode | null)?.name ?? ''),
      });

    case 'BlockStatement':
      return makeBlock('block', {}, { body: bodyToBlocks(node, source) });

    case 'EmptyStatement':
      return makeBlock('empty');

    // Everything else (classes, labeled statements, imports, `with`, ...) is
    // preserved verbatim rather than approximated.
    default:
      return makeBlock('raw', { source: slice(node, source) });
  }
}
