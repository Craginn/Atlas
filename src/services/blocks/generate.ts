import { BlockNode, BlockProgram } from './types';

// Blocks → JavaScript source.
//
// The inverse of parse.ts. Every `raw` block and every expression field is
// emitted verbatim, so text that came from the user's file leaves this function
// byte-identical to how it arrived.

const INDENT = '  ';

export function generateCode(program: BlockProgram): string {
  return program.roots.map(b => emit(b, 0)).join('\n');
}

/** Emit one block, prefixed with any comments/blank line captured above it. */
function emit(block: BlockNode, depth: number): string {
  const body = emitBody(block, depth);
  const f = block.fields;

  let prefix = '';
  if (f.blankBefore === 'true') prefix += '\n';
  if (f.leading) {
    // Emitted verbatim, indentation included. The parser captured each comment
    // with its own leading whitespace, so re-indenting here would only flatten
    // deliberate alignment (commented-out code, ASCII tables) and, on a CRLF
    // file, rewrite the line endings.
    prefix += f.leading + '\n';
  }
  return prefix + body;
}

/** Emit the block's own syntax, without leading trivia. */
function emitBody(block: BlockNode, depth: number): string {
  const pad = INDENT.repeat(depth);
  const f = block.fields;

  switch (block.kind) {
    // A raw block is source we never decomposed. Re-indenting it would corrupt
    // template literals and multi-line strings, so it goes back exactly as it
    // came in — including its original leading whitespace.
    case 'raw':
      return f.source ?? '';

    case 'empty':
      return `${pad};`;

    case 'break':
      return `${pad}break${f.label ? ` ${f.label}` : ''};`;

    case 'continue':
      return `${pad}continue${f.label ? ` ${f.label}` : ''};`;

    // A call is an `expression` with its two halves split apart so the UI can
    // offer a picker for the callee. It emits as ordinary call syntax, so the
    // parser reading this back produces a plain `expression` block — the box
    // degrades to "Do" on reload, which is lossless.
    case 'call': {
      const args = (f.args ?? '').trim();
      return `${pad}${f.callee ?? ''}(${args});`;
    }

    case 'expression':
      return `${pad}${f.expression ?? ''};`;

    case 'return':
      // `return;` and `return undefined;` differ, so preserve the empty case.
      return f.argument ? `${pad}return ${f.argument};` : `${pad}return;`;

    case 'throw':
      return `${pad}throw ${f.argument ?? ''};`;

    case 'var':
      return `${pad}${f.declKind ?? 'let'} ${f.declarations ?? ''};`;

    case 'function':
      return (
        `${pad}${f.async === 'true' ? 'async ' : ''}function${f.generator === 'true' ? '*' : ''} ` +
        `${f.name ?? ''}(${f.params ?? ''}) {\n` +
        emitSlot(block, 'body', depth + 1) +
        `\n${pad}}`
      );

    case 'block':
      return `${pad}{\n` + emitSlot(block, 'body', depth + 1) + `\n${pad}}`;

    case 'if': {
      let out =
        `${pad}if (${f.test ?? ''}) {\n` +
        emitSlot(block, 'then', depth + 1) +
        `\n${pad}}`;
      // Only emit `else` when the slot actually has content — an empty else
      // block is valid JS but noise the user never wrote.
      const alt = block.slots.else ?? [];
      if (alt.length === 1 && alt[0].kind === 'if' && !alt[0].fields.leading) {
        // Collapse `else { if (...) }` back to `else if (...)`. Nesting it is
        // semantically identical but adds a level of indentation per branch,
        // so a long chain would march off the right edge of the screen.
        out += ` else ${emitBody(alt[0], depth).slice(pad.length)}`;
      } else if (alt.length > 0) {
        out += ` else {\n` + emitSlot(block, 'else', depth + 1) + `\n${pad}}`;
      }
      return out;
    }

    case 'for':
      return (
        `${pad}for (${f.init ?? ''}; ${f.test ?? ''}; ${f.update ?? ''}) {\n` +
        emitSlot(block, 'body', depth + 1) +
        `\n${pad}}`
      );

    case 'forIn':
      return (
        `${pad}for (${f.left ?? ''} ${f.operator ?? 'of'} ${f.right ?? ''}) {\n` +
        emitSlot(block, 'body', depth + 1) +
        `\n${pad}}`
      );

    case 'while':
      return (
        `${pad}while (${f.test ?? ''}) {\n` +
        emitSlot(block, 'body', depth + 1) +
        `\n${pad}}`
      );

    case 'doWhile':
      return (
        `${pad}do {\n` +
        emitSlot(block, 'body', depth + 1) +
        `\n${pad}} while (${f.test ?? ''});`
      );

    case 'switch':
      return (
        `${pad}switch (${f.discriminant ?? ''}) {\n` +
        (block.slots.cases ?? []).map(c => emit(c, depth + 1)).join('\n') +
        `\n${pad}}`
      );

    case 'case': {
      // `default:` has no test expression; a normal case does.
      const head = f.test ? `${pad}case ${f.test}:` : `${pad}default:`;
      const body = emitSlot(block, 'body', depth + 1);
      return body ? `${head}\n${body}` : head;
    }

    case 'try': {
      let out = `${pad}try {\n` + emitSlot(block, 'body', depth + 1) + `\n${pad}}`;
      // A try must keep at least one of catch/finally to stay valid, so emit
      // catch whenever the parser recorded one — even with an empty body.
      if (f.hasCatch === 'true') {
        const param = f.catchParam ? ` (${f.catchParam})` : '';
        out += ` catch${param} {\n` + emitSlot(block, 'catch', depth + 1) + `\n${pad}}`;
      }
      if (f.hasFinally === 'true') {
        out += ` finally {\n` + emitSlot(block, 'finally', depth + 1) + `\n${pad}}`;
      }
      return out;
    }

    default:
      return `${pad}${f.source ?? ''}`;
  }
}

function emitSlot(block: BlockNode, slot: string, depth: number): string {
  return (block.slots[slot] ?? []).map(b => emit(b, depth)).join('\n');
}
