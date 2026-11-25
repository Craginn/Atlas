// The beginner layer of the Block Canvas.
//
//   describeBlock  — one plain-English line per block ("If the player's text
//                    contains "sword"", "Remember hp = 10 (kept between turns)").
//   RECIPES        — fill-in-the-blank conditions and actions, so a first-time
//                    scripter picks "the player's text contains [word]" instead
//                    of typing `text.toLowerCase().includes("word")`.
//   adviseScript   — looks at a script and suggests what to add next, and why.
//
// Everything here reads the block tree; nothing executes code.

import { BlockNode, makeBlock } from './types';

// ------------------------------------------------------------------ describe

const unquote = (s: string) => s.trim().replace(/^(['"`])(.*)\1$/, '$2');

/** A condition, in words where the pattern is recognisable; the code otherwise. */
export function describeCondition(test: string): string {
  const t = test.trim();
  let m: RegExpMatchArray | null;
  if (!t) return 'a condition (not filled in yet)';
  if (t === 'true') return 'always';
  if ((m = t.match(/^!\s*\((.+)\)$/s))) return `NOT (${describeCondition(m[1])})`;
  // Split a top-level && / || into parts (no nesting awareness beyond parentheses).
  for (const [op, word] of [['||', 'or'], ['&&', 'and']] as const) {
    const parts = splitTop(t, op);
    if (parts.length > 1) return parts.map(describeCondition).join(` ${word} `);
  }
  if ((m = t.match(/^text(?:\.toLowerCase\(\))?\.includes\((.+)\)$/))) return `the text contains ${quote(unquote(m[1]))}`;
  if ((m = t.match(/^!text(?:\.toLowerCase\(\))?\.includes\((.+)\)$/))) return `the text does not contain ${quote(unquote(m[1]))}`;
  if ((m = t.match(/^text(?:\.toLowerCase\(\))?\.startsWith\((.+)\)$/))) return `the text starts with ${quote(unquote(m[1]))}`;
  if (/^info\.actionCount\s*(<=\s*1|===?\s*[01]|<\s*2)$/.test(t)) return "it's the first turn";
  if ((m = t.match(/^Math\.random\(\)\s*<\s*(0?\.\d+|1)$/))) return `a ${Math.round(Number(m[1]) * 100)}% chance`;
  if ((m = t.match(/^\(?\s*state\.([\w.]+)(?:\s*\?\?\s*[^)]+)?\)?\s*(===?|!==?|>=|<=|>|<)\s*(.+)$/))) {
    return `saved value ${m[1]} ${OPS[m[2]] ?? m[2]} ${m[3].trim()}`;
  }
  if ((m = t.match(/^state\.([\w.]+)$/))) return `saved value ${m[1]} is set`;
  if ((m = t.match(/^!state\.([\w.]+)$/))) return `saved value ${m[1]} is not set yet`;
  if ((m = t.match(/^storyCards\.some\(.+?includes\((.+?)\)\)$/))) return `a story card with key ${quote(unquote(m[1]))} exists`;
  if (/^text\.trim\(\)\s*(!==?\s*['"]{2}|\.length\s*>\s*0)$/.test(t)) return 'the text is not empty';
  return t;
}

const OPS: Record<string, string> = {
  '===': 'is', '==': 'is', '!==': 'is not', '!=': 'is not',
  '>': 'is more than', '<': 'is less than', '>=': 'is at least', '<=': 'is at most',
};

const quote = (s: string) => `"${s}"`;

/** Split on a top-level operator, ignoring ones inside brackets or strings. */
function splitTop(src: string, op: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quoteCh = '';
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoteCh) { if (c === quoteCh && src[i - 1] !== '\\') quoteCh = ''; continue; }
    if (c === '"' || c === "'" || c === '`') { quoteCh = c; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (depth === 0 && src.startsWith(op, i)) {
      parts.push(src.slice(start, i).trim());
      start = i + op.length;
      i += op.length - 1;
    }
  }
  parts.push(src.slice(start).trim());
  return parts.filter(Boolean);
}

/** An action (expression statement), in words where recognisable. */
export function describeAction(expr: string): string {
  const e = expr.trim();
  let m: RegExpMatchArray | null;
  if (/^modifier\(\s*text\s*\)$/.test(e)) return 'Run the hook on the text (AI Dungeon needs this last line)';
  if ((m = e.match(/^(?:log|console\.log)\((.*)\)$/s))) return `Print ${m[1] || 'a message'} to the log`;
  if ((m = e.match(/^console\.error\((.*)\)$/s))) return `Report an error: ${m[1]}`;
  if ((m = e.match(/^state\.message\s*=\s*(.+)$/s))) return `Show the player a message: ${m[1]}`;
  if ((m = e.match(/^state\.([\w.]+)\s*\+=\s*(.+)$/s))) return `Add ${m[2]} to saved value ${m[1]}`;
  if ((m = e.match(/^state\.([\w.]+)\s*-=\s*(.+)$/s))) return `Subtract ${m[2]} from saved value ${m[1]}`;
  if ((m = e.match(/^state\.([\w.]+)\s*(\+\+|--)$/))) return `${m[2] === '++' ? 'Add 1 to' : 'Subtract 1 from'} saved value ${m[1]}`;
  if ((m = e.match(/^state\.([\w.]+)\s*=\s*state\.\1\s*\|\|\s*(.+)$/s))) return `Set up saved value ${m[1]} (starts as ${m[2]})`;
  if ((m = e.match(/^state\.([\w.]+)\s*\?\?=\s*(.+)$/s))) return `Set up saved value ${m[1]} (starts as ${m[2]})`;
  if ((m = e.match(/^state\.([\w.]+)\s*=\s*(.+)$/s))) return `Remember ${m[1]} = ${m[2]} (kept between turns)`;
  if ((m = e.match(/^text\s*=\s*text\s*\+\s*(.+)$/s))) return `Add ${m[1]} to the end of the text`;
  if ((m = e.match(/^text\s*=\s*(.+?)\s*\+\s*text$/s))) return `Add ${m[1]} to the start of the text`;
  if ((m = e.match(/^text\s*=\s*text\.replace\((.+)\)$/s))) return `Replace part of the text (${m[1]})`;
  if ((m = e.match(/^text\s*=\s*(.+)$/s))) return `Change the text to ${m[1]}`;
  if (/^addStoryCard\(/.test(e)) return 'Create a story card';
  if (/^updateStoryCard\(/.test(e)) return 'Change a story card';
  if (/^removeStoryCard\(/.test(e)) return 'Delete a story card';
  if (/^stop\s*=\s*true$/.test(e)) return 'Stop the AI from writing this turn';
  if ((m = e.match(/^([A-Za-z_$][\w$.]*)\((.*)\)$/s))) return `Run ${m[1]}(${m[2]})`;
  return e;
}

/** One plain-English line for a block. */
export function describeBlock(b: BlockNode): string {
  const f = b.fields;
  switch (b.kind) {
    case 'function':
      if (f.name === 'modifier') return "The hook's main function — AI Dungeon runs it with the incoming text";
      return `A reusable function ${f.name || '(unnamed)'}(${f.params ?? ''})`;
    case 'var': {
      const m = (f.declarations ?? '').match(/^([\w$]+)\s*=\s*([\s\S]+)$/);
      if (!m) return `Create ${f.declarations ?? 'a variable'}`;
      return f.declKind === 'const'
        ? `Name ${m[2].length > 60 ? 'a value' : m[2]} as ${m[1]} (fixed)`
        : `Create ${m[1]}, starting as ${m[2].length > 60 ? 'a value' : m[2]}`;
    }
    case 'return':
      if (/^\{\s*text\s*\}$/.test((f.argument ?? '').trim())) return 'Hand the text back to AI Dungeon';
      if (/^\{\s*text\s*,\s*stop\s*:\s*true\s*\}$/.test((f.argument ?? '').trim())) return 'Hand the text back and stop the AI';
      return f.argument ? `Give back ${f.argument}` : 'Stop here';
    case 'if':
      return `If ${describeCondition(f.test ?? '')}`;
    case 'while':
      return `Repeat while ${describeCondition(f.test ?? '')}`;
    case 'doWhile':
      return `Do, then repeat while ${describeCondition(f.test ?? '')}`;
    case 'for':
      return `Repeat: start ${f.init}, keep going while ${f.test}, then ${f.update} each time`;
    case 'forIn': {
      const name = (f.left ?? '').replace(/^(const|let|var)\s+/, '');
      return f.operator === 'in' ? `For each key ${name} in ${f.right}` : `For each ${name} in ${f.right}`;
    }
    case 'switch':
      return `Choose a branch based on ${f.discriminant}`;
    case 'case':
      return f.test ? `When it is ${f.test}` : 'Otherwise';
    case 'try':
      return 'Try these steps; if one fails, run the error steps instead of crashing';
    case 'throw':
      return `Stop with an error: ${f.argument}`;
    case 'break':
      return 'Leave the loop';
    case 'continue':
      return 'Skip to the next round of the loop';
    case 'call':
      return f.callee ? `Run ${f.callee}(${f.args ?? ''})` : 'Run a function (pick one)';
    case 'expression':
      return describeAction(f.expression ?? '');
    case 'block':
      return 'A group of steps';
    case 'empty':
      return 'Does nothing';
    case 'raw':
    default:
      return 'Code shown as written';
  }
}

// ------------------------------------------------------------------ recipes

export interface RecipeInput {
  key: string;
  label: string;
  placeholder?: string;
  /** Offer a fixed list instead of free text. */
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

export interface Recipe {
  id: string;
  label: string;
  /** Why you'd use it, in one sentence. */
  why: string;
  inputs: RecipeInput[];
  build: (v: Record<string, string>) => string;
}

const str = (s: string) => JSON.stringify(s ?? '');
const ident = (s: string, fallback: string) => (s ?? '').trim().replace(/[^\w$.]/g, '') || fallback;
const num = (s: string, fallback: string) => (/^-?\d+(\.\d+)?$/.test((s ?? '').trim()) ? s.trim() : fallback);

/** Conditions — for If / While fields. */
export const CONDITION_RECIPES: Recipe[] = [
  {
    id: 'textIncludes', label: "The player's text contains a word",
    why: 'React when the player mentions something, like "sword" or "rest".',
    inputs: [{ key: 'word', label: 'word', placeholder: 'sword' }],
    build: v => `text.toLowerCase().includes(${str((v.word ?? '').toLowerCase())})`,
  },
  {
    id: 'textMissing', label: "The player's text does NOT contain a word",
    why: 'Run something only when a word is absent.',
    inputs: [{ key: 'word', label: 'word', placeholder: 'sword' }],
    build: v => `!text.toLowerCase().includes(${str((v.word ?? '').toLowerCase())})`,
  },
  {
    id: 'stateCompare', label: 'A saved number compares to a value',
    why: 'Check stats you keep on `state`, like health or gold. Missing values count as 0.',
    inputs: [
      { key: 'name', label: 'saved value', placeholder: 'hp' },
      { key: 'op', label: 'is', options: [
        { value: '<=', label: 'at most' }, { value: '>=', label: 'at least' },
        { value: '<', label: 'less than' }, { value: '>', label: 'more than' }, { value: '===', label: 'exactly' },
      ], defaultValue: '<=' },
      { key: 'value', label: 'number', placeholder: '0' },
    ],
    build: v => `(state.${ident(v.name, 'hp')} ?? 0) ${v.op || '<='} ${num(v.value, '0')}`,
  },
  {
    id: 'flagOn', label: 'A saved yes/no flag is on',
    why: 'Remember that something happened (met the king, opened the door) and check it later.',
    inputs: [{ key: 'name', label: 'flag', placeholder: 'metKing' }],
    build: v => `state.${ident(v.name, 'flag')} === true`,
  },
  {
    id: 'firstTurn', label: "It's the first turn",
    why: 'Set things up once, at the start of the adventure.',
    inputs: [],
    build: () => 'info.actionCount <= 1',
  },
  {
    id: 'chance', label: 'A random chance',
    why: 'Make something happen only sometimes — a 20% chance of a surprise.',
    inputs: [{ key: 'percent', label: 'percent', placeholder: '20' }],
    build: v => `Math.random() < ${Math.max(0, Math.min(100, Number(num(v.percent, '20')))) / 100}`,
  },
  {
    id: 'cardExists', label: 'A story card with a key exists',
    why: "Avoid creating the same card twice — check first.",
    inputs: [{ key: 'key', label: 'key', placeholder: 'dragon' }],
    build: v => `storyCards.some(c => String(c.keys).includes(${str(v.key)}))`,
  },
  {
    id: 'notEmpty', label: "The text isn't empty",
    why: 'On Continue or the opening turn the text can be empty.',
    inputs: [],
    build: () => "text.trim() !== ''",
  },
];

/** Actions — for Do fields. */
export const ACTION_RECIPES: Recipe[] = [
  {
    id: 'remember', label: 'Remember a value',
    why: 'Values on `state` are kept from one turn to the next.',
    inputs: [{ key: 'name', label: 'name', placeholder: 'hp' }, { key: 'value', label: 'value', placeholder: '10' }],
    build: v => `state.${ident(v.name, 'value')} = ${(v.value ?? '').trim() || '0'}`,
  },
  {
    id: 'addTo', label: 'Add to a saved number',
    why: 'Count things — gold found, turns passed. Starts from 0 if it was never set.',
    inputs: [{ key: 'name', label: 'saved value', placeholder: 'gold' }, { key: 'amount', label: 'amount', placeholder: '1' }],
    build: v => `state.${ident(v.name, 'count')} = (state.${ident(v.name, 'count')} ?? 0) + ${num(v.amount, '1')}`,
  },
  {
    id: 'message', label: 'Show the player a message',
    why: 'A small notice in the game — not part of the story text.',
    inputs: [{ key: 'msg', label: 'message', placeholder: 'You found a sword!' }],
    build: v => `state.message = ${str(v.msg)}`,
  },
  {
    id: 'append', label: 'Add a sentence to the end of the text',
    why: 'Add to what the player sent, or to what the AI wrote (in the Output hook).',
    inputs: [{ key: 'sentence', label: 'sentence', placeholder: 'The wind howls.' }],
    build: v => `text = text + ${str(' ' + (v.sentence ?? '').trim())}`,
  },
  {
    id: 'replaceWord', label: 'Replace a word in the text',
    why: 'Swap one word for another everywhere it appears (any capitalisation).',
    inputs: [{ key: 'from', label: 'replace', placeholder: 'sword' }, { key: 'to', label: 'with', placeholder: 'blade' }],
    build: v => `text = text.replace(new RegExp(${str((v.from ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))}, 'gi'), ${str(v.to)})`,
  },
  {
    id: 'addCard', label: 'Create a story card',
    why: 'Teach the AI about something new; it is added when its keys appear in the story.',
    inputs: [
      { key: 'keys', label: 'keys', placeholder: 'dragon, wyrm' },
      { key: 'entry', label: 'what the AI should know', placeholder: 'A red dragon guards the pass.' },
    ],
    build: v => `addStoryCard(${str(v.keys)}, ${str(v.entry)}, "Custom")`,
  },
  {
    id: 'log', label: 'Print to the log',
    why: 'See a value while testing — shows in the console, never in the game.',
    inputs: [{ key: 'what', label: 'what', placeholder: 'text' }],
    build: v => `log(${(v.what ?? '').trim() || 'text'})`,
  },
];

// ------------------------------------------------------------------ advisor

export interface Suggestion {
  id: string;
  level: 'important' | 'tip';
  title: string;
  why: string;
  /** Blocks to add, and where: inside `target` (prepend when atStart), or at the end of the script. */
  add?: { blocks: () => BlockNode[]; target?: { blockId: string; slot: string; atStart?: boolean } };
  /** A block to point at instead of adding one. */
  focusBlockId?: string;
}

/** Every expression/field text in a tree, for cheap "is X used" checks. */
function allText(nodes: BlockNode[]): string {
  const parts: string[] = [];
  const walk = (list: BlockNode[]) => {
    for (const n of list) {
      for (const [k, v] of Object.entries(n.fields)) if (k !== 'leading') parts.push(v);
      Object.values(n.slots).forEach(walk);
    }
  };
  walk(nodes);
  return parts.join('\n');
}

function find(nodes: BlockNode[], pred: (b: BlockNode) => boolean): BlockNode | null {
  for (const n of nodes) {
    if (pred(n)) return n;
    for (const list of Object.values(n.slots)) {
      const hit = find(list, pred);
      if (hit) return hit;
    }
  }
  return null;
}

export const hookTemplate = (): BlockNode[] => [
  makeBlock('function', { name: 'modifier', params: 'text', style: 'arrow', declKind: 'const', async: 'false', generator: 'false' }, {
    body: [makeBlock('return', { argument: '{ text }' })],
  }),
  makeBlock('expression', { expression: 'modifier(text)', blankBefore: 'true' }),
];

/**
 * What to add next, and why. `scriptName` decides the role: the Library holds
 * shared helpers; every other script is a hook AI Dungeon calls with `text`.
 */
export function adviseScript(roots: BlockNode[], scriptName: string, libraryText = ''): Suggestion[] {
  const out: Suggestion[] = [];
  const text = allText(roots);
  const isHook = scriptName !== 'Library';

  if (/\bplot\./.test(text)) {
    out.push({
      id: 'plot', level: 'important',
      title: '`plot` is not part of AI Dungeon',
      why: 'Older Atlas blocks used `plot.plotEssentials`, which only existed in Atlas. In a Context Modifier, Plot Essentials is `text.slice(0, info.memoryLength)`.',
      focusBlockId: find(roots, b => Object.values(b.fields).some(v => /\bplot\./.test(v)))?.id,
    });
  }

  if (isHook) {
    const modifier = find(roots, b => b.kind === 'function' && b.fields.name === 'modifier');
    if (!modifier) {
      out.push({
        id: 'template', level: 'important',
        title: 'Start from the hook template',
        why: 'AI Dungeon runs a hook by calling `modifier(text)` and uses whatever it returns. The template sets up that function, the `return { text }` at its end, and the call.',
        add: { blocks: hookTemplate },
      });
    } else {
      const body = modifier.slots.body ?? [];
      const returns = find(body, b => b.kind === 'return');
      if (!returns) {
        out.push({
          id: 'return', level: 'important',
          title: 'Hand the text back at the end',
          why: 'Without `return { text }`, your changes to `text` are thrown away and AI Dungeon keeps the original.',
          add: { blocks: () => [makeBlock('return', { argument: '{ text }' })], target: { blockId: modifier.id, slot: 'body' } },
        });
      }
      const called = roots.some(r => r.kind === 'expression' && /^modifier\(\s*text\s*\)$/.test((r.fields.expression ?? '').trim()));
      if (!called) {
        out.push({
          id: 'call', level: 'important',
          title: 'Add the `modifier(text)` line at the end',
          why: 'Defining the function is not enough — this last line is what actually runs it.',
          add: { blocks: () => [makeBlock('expression', { expression: 'modifier(text)' })] },
        });
      }
      // State read deeper than one level but never set up.
      const nested = new Set([...text.matchAll(/\bstate\.(\w+)\.\w/g)].map(m => m[1]));
      for (const key of nested) {
        const setUp = new RegExp(`\\bstate\\.${key}\\s*(=(?!=)|\\?\\?=|\\|\\|=)`).test(text + '\n' + libraryText);
        if (!setUp && key !== 'memory') {
          out.push({
            id: `init-${key}`, level: 'important',
            title: `Set up \`state.${key}\` before using it`,
            why: `The script reads inside \`state.${key}\`, but nothing creates it. On the first turn it doesn't exist, so the hook crashes with "Cannot read properties of undefined".`,
            add: { blocks: () => [makeBlock('expression', { expression: `state.${key} = state.${key} || {}` })], target: { blockId: modifier.id, slot: 'body', atStart: true } },
          });
        }
      }
      if (!find(body, b => b.kind === 'if') && body.length <= 2) {
        const recipe = scriptName === 'Output Modifier'
          ? { title: 'Change what the AI wrote', why: 'The Output hook gets the AI\'s reply as `text`. Try adding a sentence or swapping a word.', expr: 'text = text + " The wind howls."' }
          : { title: 'React to what the player typed', why: 'Most hooks start with an If: when the text contains a word, do something.', expr: 'state.message = "You mentioned a sword!"' };
        out.push({
          id: 'react', level: 'tip', title: recipe.title, why: recipe.why,
          add: {
            blocks: () => [scriptName === 'Output Modifier'
              ? makeBlock('expression', { expression: recipe.expr })
              : makeBlock('if', { test: 'text.toLowerCase().includes("sword")' }, { then: [makeBlock('expression', { expression: recipe.expr })], else: [] })],
            target: { blockId: modifier.id, slot: 'body', atStart: true },
          },
        });
      }
    }
  }

  // Empty branches and unused helpers.
  const emptyIf = find(roots, b => b.kind === 'if' && (b.slots.then ?? []).length === 0);
  if (emptyIf) {
    out.push({
      id: `empty-${emptyIf.id}`, level: 'tip',
      title: 'An If has nothing inside yet',
      why: `"${describeBlock(emptyIf)}" checks something but doesn't do anything when it's true. Add a step inside it.`,
      focusBlockId: emptyIf.id,
    });
  }
  const functions: BlockNode[] = [];
  const collect = (list: BlockNode[]) => list.forEach(b => {
    if (b.kind === 'function' && b.fields.name && b.fields.name !== 'modifier') functions.push(b);
    Object.values(b.slots).forEach(collect);
  });
  collect(roots);
  for (const fn of functions) {
    const uses = text.split(new RegExp(`\\b${fn.fields.name}\\s*\\(`)).length - 1;
    if (uses === 0 && isHook) {
      out.push({
        id: `unused-${fn.id}`, level: 'tip',
        title: `\`${fn.fields.name}\` is never used`,
        why: 'A function only runs when something calls it. Add a "Call a Function" block where it should happen.',
        focusBlockId: fn.id,
      });
    }
  }
  return out;
}
