import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';

// Shared JS highlighter used by BOTH the main thread (CodeBuffer) and the
// highlight worker (workers/highlight.worker.ts). Keeping one implementation
// means the async (worker) and sync paths produce identical HTML — rainbow
// bracket colors included — and both escape HTML entities in code.

const OPEN = new Set(['(', '[', '{']);
const CLOSE = new Set([')', ']', '}']);
const RAINBOW_DEPTH = 6; // number of distinct nesting colors before cycling

// The rainbow-bracket palette (see prism-traditional.css), reused so the indent
// guides share the exact nesting colors the brackets already use.
export const NEST_COLORS = ['#818cf8', '#fb7185', '#34d399', '#fbbf24', '#a78bfa', '#22d3ee'];

// Helper to get the rainbow color for a given depth
export const getNestColor = (depth: number) => NEST_COLORS[depth % NEST_COLORS.length];

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Running bracket depth while serializing tokens. Module-global so the worker
// (its own module instance) tracks depth across a whole file in one pass.
let bracketDepth = 0;

// Highlight JS while adding bracket-depth classes to (){}[] punctuation so
// nested brackets get consistent, distinct rainbow colors. Prism's default
// theme colors all punctuation flat, which made deep nesting hard to read.
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

// Tokenize + serialize a whole chunk of code in one pass. Resets the bracket
// depth first so the rainbow colors always start at depth 0 for the chunk.
export function highlightJs(code: string): string {
  bracketDepth = 0;
  const tokens = Prism.tokenize(code, Prism.languages.javascript);
  return tokens.map(stringify).join('');
}
