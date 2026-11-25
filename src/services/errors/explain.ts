// Plain-language explanations for script errors.
//
// The JS engine's messages are written for people who already know what went
// wrong ("Cannot read properties of undefined (reading 'hp')"). This turns the
// common ones into: a headline naming the actual expression on the failing line,
// what that means, and what to do about it. Unknown messages fall back to the
// engine text rather than guessing.

import { AID_GLOBALS } from '../offlineSimulationService';

export interface Explanation {
  /** One line, names the culprit when it can be found on the line. */
  title: string;
  /** What happened, in plain words. */
  explanation: string;
  /** What to try. Absent when there is no confident suggestion. */
  fix?: string;
}

export interface ExplainContext {
  /** The text of the failing line. */
  sourceLine?: string;
  /** 1-based column of the failure on that line, when known. */
  column?: number;
  /** Names the scripts declare, for "did you mean" suggestions. */
  knownNames?: string[];
}

const STRING_AND_ARRAY_METHODS = [
  'includes', 'indexOf', 'lastIndexOf', 'startsWith', 'endsWith', 'slice', 'substring', 'split',
  'replace', 'replaceAll', 'trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase', 'match',
  'matchAll', 'padStart', 'padEnd', 'repeat', 'charAt', 'search', 'push', 'pop', 'shift', 'unshift',
  'splice', 'map', 'filter', 'find', 'findIndex', 'some', 'every', 'forEach', 'reduce', 'join',
  'concat', 'sort', 'reverse', 'flat', 'flatMap', 'keys', 'values', 'entries', 'toString', 'toFixed',
];

/** Levenshtein distance, capped — only small distances are useful as typos. */
export function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    let rowMin = prev[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
      rowMin = Math.min(rowMin, prev[j]);
    }
    if (rowMin > cap) return cap + 1;
  }
  return prev[b.length];
}

/** The closest candidate within `maxDistance`, case differences counting as 1. */
export function closest(word: string, candidates: Iterable<string>, maxDistance = 2): string | undefined {
  let best: string | undefined;
  let bestD = maxDistance + 1;
  for (const c of candidates) {
    if (c === word) continue;
    const d = c.toLowerCase() === word.toLowerCase() ? 1 : editDistance(word, c, maxDistance);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

/**
 * The member chain that `.prop` (or `["prop"]`) is read from on `line`, picking
 * the occurrence nearest `column`. `state.player.hp` + `hp` → `state.player`.
 */
export function receiverOf(line: string, prop: string, column?: number): string | undefined {
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`([A-Za-z_$][\\w$]*(?:\\??\\.[A-Za-z_$][\\w$]*|\\[[^\\]]*\\])*)\\??(?:\\.${esc}\\b|\\[\\s*['"\`]${esc}['"\`]\\s*\\])`, 'g');
  let best: { text: string; dist: number } | undefined;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    const dist = column === undefined ? 0 : Math.abs(m.index + m[1].length - (column - 1));
    if (!best || dist < best.dist) best = { text: m[1], dist };
  }
  return best?.text;
}

const code = (s: string) => `\`${s}\``;

export function explainError(message: string, ctx: ExplainContext = {}): Explanation {
  const line = ctx.sourceLine ?? '';
  const known = new Set([...AID_GLOBALS, ...(ctx.knownNames ?? [])]);
  let m: RegExpMatchArray | null;

  // ---------------------------------------------------------- undefined access
  if ((m = message.match(/Cannot (read|set) propert(?:y|ies) of (undefined|null)(?: \((?:reading|setting) '(.+?)'\))?/))) {
    const [, verb, nothing, prop] = m;
    const target = prop ? receiverOf(line, prop, ctx.column) : undefined;
    const what = target ? code(target) : 'Something on this line';
    const action = verb === 'read' ? `read ${prop ? code('.' + prop) : 'a property'} from it` : `set ${prop ? code('.' + prop) : 'a property'} on it`;
    const onState = target?.startsWith('state.');
    return {
      title: `${what} is ${nothing}, so the script can't ${action}`,
      explanation:
        `${what} doesn't hold anything yet (it is ${nothing}). ` +
        (onState
          ? 'Values saved on `state` only exist after something sets them, so on the first turn (or after a reset) this is empty.'
          : 'It may be misspelled, not set yet on this turn, or a lookup (like `.find(...)`) that found nothing.'),
      fix: target
        ? onState
          ? `Create it before this line, e.g. ${code(`${target} = ${target} || {};`)} near the top of the script.`
          : `Check ${code(target)} first: ${code(`if (${target}) { … }`)}, or read it safely with ${code(`${target}?.${prop ?? 'x'}`)}.`
        : 'Check each value on this line is set before it is used, or guard it with an `if`.',
    };
  }

  // -------------------------------------------------------------- not defined
  if ((m = message.match(/^(?:ReferenceError: )?([A-Za-z_$][\w$]*) is not defined/))) {
    const name = m[1];
    const near = closest(name, known);
    return {
      title: `${code(name)} doesn't exist here`,
      explanation:
        `The script uses ${code(name)}, but nothing with that name was created before this line. ` +
        'Names are case-sensitive, and a variable made inside one function or block is not visible outside it.',
      fix: near
        ? `Did you mean ${code(near)}?`
        : `Create it first (e.g. ${code(`let ${name} = …;`)}), or check the spelling. If it lives in the Library, make sure the Library defines it at the top level.`,
    };
  }

  // ------------------------------------------------------------ not a function
  if ((m = message.match(/^(?:TypeError: )?(.+?) is not a function/))) {
    const expr = m[1].trim();
    const method = expr.split('.').pop() ?? expr;
    const near = expr.includes('.') ? closest(method, STRING_AND_ARRAY_METHODS) : closest(expr, known);
    return {
      title: `${code(expr)} is not a function`,
      explanation:
        `The script tries to call ${code(expr + '(...)')}, but that value isn't a function — it is missing (undefined), misspelled, or holds a plain value.`,
      fix: near
        ? `Did you mean ${code(expr.includes('.') ? expr.slice(0, -method.length) + near : near)}?`
        : 'Check the spelling, and that the function is defined (in this script or the Library) before it is called.',
    };
  }

  if ((m = message.match(/^(?:TypeError: )?(.+?) is not a constructor/))) {
    return {
      title: `${code(m[1])} can't be used with ${code('new')}`,
      explanation: `${code('new ' + m[1] + '(...)')} only works on classes and constructor functions.`,
      fix: `Remove ${code('new')}, or check that ${code(m[1])} is the class you meant.`,
    };
  }

  if ((m = message.match(/^(?:TypeError: )?(.+?) is not iterable/))) {
    return {
      title: `${code(m[1])} is not a list`,
      explanation: `A loop (${code('for … of')}) or spread (${code('...')}) needs a list, but got something else — often undefined.`,
      fix: `Make sure ${code(m[1])} is an array, or fall back to an empty one: ${code(`${m[1]} || []`)}.`,
    };
  }

  // ---------------------------------------------------------- declarations
  if (/Assignment to constant variable/.test(message)) {
    const target = line.match(/([A-Za-z_$][\w$]*)\s*(?:[+\-*/%]?=|\+\+|--)(?!=)/)?.[1];
    return {
      title: target ? `${code(target)} is a constant and can't be changed` : 'A constant was changed',
      explanation: `It was declared with ${code('const')}, which means it can never be reassigned.`,
      fix: target ? `Declare it with ${code('let')} instead: ${code(`let ${target} = …`)}.` : `Declare it with ${code('let')} instead of ${code('const')}.`,
    };
  }

  if ((m = message.match(/Identifier '(.+?)' has already been declared/))) {
    return {
      title: `${code(m[1])} is declared twice`,
      explanation:
        `${code(m[1])} is created with ${code('let')}/${code('const')}/${code('function')} more than once in the same scope. ` +
        'The Library runs in the same scope as every hook, so a name declared in both clashes.',
      fix: `Rename one of them, or drop the second ${code('let')}/${code('const')} and just assign: ${code(`${m[1]} = …`)}.`,
    };
  }

  if ((m = message.match(/Cannot access '(.+?)' before initialization/))) {
    return {
      title: `${code(m[1])} is used before it is created`,
      explanation: `The line that declares ${code(m[1])} with ${code('let')}/${code('const')} comes after this use.`,
      fix: `Move the declaration of ${code(m[1])} above this line.`,
    };
  }

  // ---------------------------------------------------------- runaway code
  if (/Maximum call stack size exceeded/.test(message)) {
    return {
      title: 'A function keeps calling itself forever',
      explanation: 'This is infinite recursion: a function calls itself (directly or through another function) with no point where it stops.',
      fix: 'Add a condition that returns without calling again, or check the two functions aren\'t calling each other.',
    };
  }
  if (/timed out/i.test(message)) {
    return {
      title: 'The script never finished',
      explanation: 'It ran past the time limit, which almost always means a loop that never ends — a `while` whose condition never becomes false, or a `for` counter that never reaches its end.',
      fix: 'Check every loop changes something its condition depends on.',
    };
  }

  // ---------------------------------------------------------- AID API
  if ((m = message.match(/Story card at index (-?\d+) does not exist/))) {
    return {
      title: `There is no story card at position ${m[1]}`,
      explanation: 'Story card positions start at 0 and shift whenever a card is added or removed, so a fixed number goes stale.',
      fix: `Look the position up first: ${code('const i = storyCards.findIndex(c => c.keys.includes("…"));')} then use ${code('i')} if it isn't -1.`,
    };
  }

  // ---------------------------------------------------------- JSON
  if (/JSON|Unexpected token .* in JSON|is not valid JSON/.test(message) && /JSON\.parse/.test(line + message)) {
    return {
      title: 'JSON.parse got text that is not valid JSON',
      explanation: 'The text being parsed is empty, cut off, or not JSON at all.',
      fix: `Wrap it: ${code('try { data = JSON.parse(raw); } catch (e) { data = {}; }')}.`,
    };
  }

  // ---------------------------------------------------------- syntax
  if (/^(Missing|Possibly missing|Extra) /.test(message)) {
    return { title: message.split(':')[0], explanation: message };
  }
  if (/Unexpected token|Unexpected end of input|Unterminated|Invalid or unexpected token|Unexpected identifier|Unexpected string|Unexpected number|missing \) after/i.test(message)) {
    return {
      title: 'JavaScript can\'t read this line',
      explanation: `${message}. Usually a bracket, quote or comma is missing or extra right here or on the line above.`,
      fix: 'Check that every ( [ { and quote on this line is closed, and that items in a list are separated by commas.',
    };
  }

  return { title: message, explanation: 'The script stopped here with this error.' };
}

/**
 * Declared names in a script — every `let/const/var/function/class` name and
 * parameter-looking identifier. Cheap regex; it only feeds "did you mean".
 */
export function declaredNames(source: string): string[] {
  const names = new Set<string>();
  const re = /\b(?:let|const|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
  for (let m = re.exec(source); m; m = re.exec(source)) names.add(m[1]);
  return [...names];
}
