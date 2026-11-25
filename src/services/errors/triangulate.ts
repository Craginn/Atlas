// "Why is it undefined?" — trace an undefined value back to its cause.
//
// Pointing at the failing line isn't enough: `bag.push(x)` failing tells you
// *where*, not *why*. This combines two kinds of evidence:
//
//   runtime — a snapshot of the real `state` / `info` / `storyCards` at the
//             moment it failed, so each step of `state.player.inventory` can be
//             checked: which part exists, which doesn't, what keys are there.
//   code    — the scripts, parsed: where a local came from (its declaration,
//             a parameter, a `.find()` that matched nothing, a function that
//             never returns), and every place a missing value is assigned —
//             plus why that assignment hasn't happened yet (a later hook, an
//             `if` that didn't match, later in the script, inside a function
//             nothing calls).
//
// It never guesses silently: each step says what was checked.

import { parse as acornParse } from 'acorn';
import { closest } from './explain';

export interface RuntimeSnapshot {
  state?: unknown;
  info?: unknown;
  storyCards?: unknown;
  historyLength?: number;
}

export interface TraceStep {
  /** The expression checked, e.g. `state.player`. */
  expr: string;
  status: 'ok' | 'missing' | 'null' | 'unknown' | 'from';
  /** What was found, e.g. "object with 12 keys: PS, MS, …". */
  detail?: string;
}

export interface WhereSet {
  script: string;
  line: number;
  column: number;
  sourceLine: string;
  /** Why this assignment hasn't given the value yet, in words. */
  why: string;
}

export interface Triangulation {
  /** The expression that was undefined (or null). */
  target: string;
  steps: TraceStep[];
  /** The explanation, in plain words. */
  reason: string;
  /** Places the missing value is (or would be) created. */
  whereSet: WhereSet[];
  /** A concrete line that would prevent it. */
  suggestion?: string;
}

export interface TriangulateInput {
  scripts: { name: string; code: string }[];
  /** The hook that was running. */
  hook: string;
  /** Where it failed: script name + 1-based line/column. */
  script: string;
  line: number;
  column?: number;
  /** Engine message (error mode). */
  message?: string;
  /** Log mode: which argument of the log() call on `line` was undefined. */
  argIndex?: number;
  snapshot?: RuntimeSnapshot;
}

// ------------------------------------------------------------------ AST plumbing

type Node = { type: string; start: number; end: number; [k: string]: unknown };

const HOOK_ORDER = ['Input Modifier', 'Context Modifier', 'Output Modifier'];

function parse(code: string): Node | null {
  try {
    return acornParse(code, {
      ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true, locations: true,
    }) as unknown as Node;
  } catch {
    return null;
  }
}

/** Every node, with a parent map. */
function index(ast: Node) {
  const nodes: Node[] = [];
  const parent = new Map<Node, Node | null>();
  const visit = (n: unknown, p: Node | null) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(c => visit(c, p)); return; }
    const node = n as Node;
    if (typeof node.type !== 'string') return;
    nodes.push(node);
    parent.set(node, p);
    for (const k in node) {
      if (k === 'loc' || k === 'start' || k === 'end' || k === 'type') continue;
      visit(node[k], node);
    }
  };
  visit(ast, null);
  return { nodes, parent };
}

const lineStartsOf = (code: string) => {
  const starts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') starts.push(i + 1);
  return starts;
};
const offsetOf = (code: string, line: number, column = 1) => (lineStartsOf(code)[line - 1] ?? 0) + Math.max(0, column - 1);
const lineOf = (node: Node) => (node.loc as { start: { line: number; column: number } }).start;

const src = (code: string, n: Node, max = 80) => {
  const s = code.slice(n.start, n.end).replace(/\s+/g, ' ');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

interface Parsed { name: string; code: string; ast: Node; nodes: Node[]; parent: Map<Node, Node | null> }

/** Flatten `a.b[0].c` into its root and keys. Non-literal computed keys come back as null. */
function chainOf(node: Node): { root: Node; keys: (string | null)[] } {
  const keys: (string | null)[] = [];
  let n = node;
  while (n.type === 'MemberExpression' || n.type === 'ChainExpression') {
    if (n.type === 'ChainExpression') { n = n.expression as Node; continue; }
    const prop = n.property as Node;
    keys.unshift(
      n.computed
        ? (prop.type === 'Literal' ? String(prop.value) : null)
        : String(prop.name),
    );
    n = n.object as Node;
  }
  return { root: n, keys };
}

const pathText = (rootName: string, keys: (string | null)[]) =>
  rootName + keys.map(k => (k === null ? '[…]' : /^\d+$/.test(k) ? `[${k}]` : `.${k}`)).join('');

// ------------------------------------------------------------------ runtime walk

const describeValue = (v: unknown): string => {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (Array.isArray(v)) return `a list of ${v.length} item${v.length === 1 ? '' : 's'}`;
  if (typeof v === 'object') {
    const keys = Object.keys(v as object);
    if (!keys.length) return 'an empty object {}';
    return `an object with ${keys.length} key${keys.length === 1 ? '' : 's'}: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? ', …' : ''}`;
  }
  if (typeof v === 'string') return `the text ${JSON.stringify(v.length > 40 ? `${v.slice(0, 40)}…` : v)}`;
  return `${typeof v} ${String(v)}`;
};

interface WalkResult {
  steps: TraceStep[];
  /** Keys up to and including the first missing one. */
  missingAt?: number;
  closeKey?: string;
  nullAt?: number;
}

/** Check each step of a chain rooted at a global against the snapshot. */
function walkSnapshot(rootName: string, root: unknown, keys: (string | null)[]): WalkResult {
  const steps: TraceStep[] = [{ expr: rootName, status: 'ok', detail: describeValue(root) }];
  let cur = root;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const expr = pathText(rootName, keys.slice(0, i + 1));
    if (key === null) {
      steps.push({ expr, status: 'unknown', detail: 'an index worked out at runtime — not checked' });
      return { steps };
    }
    if (cur === null || typeof cur !== 'object') return { steps };
    const next = (cur as Record<string, unknown>)[key];
    if (next === undefined) {
      const keysHere = Array.isArray(cur) ? [] : Object.keys(cur as object);
      const closeKey = keysHere.length ? closest(key, keysHere) : undefined;
      steps.push({
        expr, status: 'missing',
        detail: Array.isArray(cur)
          ? `the list only has ${cur.length} item${cur.length === 1 ? '' : 's'}${cur.length ? ` (positions 0–${cur.length - 1})` : ''}`
          : keysHere.length ? `${pathText(rootName, keys.slice(0, i))} has no "${key}" — it has: ${keysHere.slice(0, 12).join(', ')}${keysHere.length > 12 ? ', …' : ''}`
          : `${pathText(rootName, keys.slice(0, i))} is empty`,
      });
      return { steps, missingAt: i, closeKey };
    }
    if (next === null) {
      steps.push({ expr, status: 'null', detail: 'set, but to null' });
      return { steps, nullAt: i };
    }
    steps.push({ expr, status: 'ok', detail: describeValue(next) });
    cur = next;
  }
  return { steps };
}

const GLOBALS = new Set(['state', 'info', 'storyCards']);

const snapshotRoot = (name: string, snap?: RuntimeSnapshot) =>
  name === 'state' ? snap?.state : name === 'info' ? snap?.info : name === 'storyCards' ? snap?.storyCards : undefined;

// ------------------------------------------------------------------ where is it set?

/** Text of a member/identifier assignment target as a path (`state.a.b`), or null. */
const assignedPath = (left: Node): string | null => {
  if (left.type === 'Identifier') return String(left.name);
  if (left.type !== 'MemberExpression') return null;
  const { root, keys } = chainOf(left);
  if (root.type !== 'Identifier' || keys.some(k => k === null)) return null;
  return pathText(String(root.name), keys);
};

interface Assignment { file: Parsed; node: Node; path: string }

function allAssignments(files: Parsed[]): Assignment[] {
  const out: Assignment[] = [];
  for (const file of files) {
    for (const n of file.nodes) {
      if (n.type === 'AssignmentExpression' && ['=', '||=', '??=', '&&='].includes(String(n.operator))) {
        const p = assignedPath(n.left as Node);
        if (p) out.push({ file, node: n, path: p });
        // `state.player = { inventory: [] }` also creates state.player.inventory.
        const right = n.right as Node;
        if (p && right.type === 'ObjectExpression') {
          for (const prop of right.properties as Node[]) {
            const key = prop.type === 'Property' ? (prop.key as Node) : null;
            const name = key ? (key.type === 'Identifier' ? key.name : key.type === 'Literal' ? key.value : null) : null;
            if (name != null) out.push({ file, node: prop, path: `${p}.${String(name)}` });
          }
        }
      }
    }
  }
  return out;
}

const functionName = (file: Parsed, fn: Node): string | null => {
  if (fn.id) return String((fn.id as Node).name);
  const p = file.parent.get(fn);
  if (p?.type === 'VariableDeclarator') return String(((p.id as Node).name) ?? '');
  if (p?.type === 'Property') return String(((p.key as Node).name) ?? '');
  return null;
};

const isFunction = (n: Node) => n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression';

const isCalled = (files: Parsed[], name: string) =>
  files.some(f => f.nodes.some(n => n.type === 'CallExpression' && (n.callee as Node).type === 'Identifier' && (n.callee as Node).name === name));

/** Why an assignment may not have happened before the failure. */
function whyNotYet(a: Assignment, files: Parsed[], hook: string, failScript: string, failOffset: number): string {
  const { file, node } = a;
  const scriptIdx = HOOK_ORDER.indexOf(file.name);
  const hookIdx = HOOK_ORDER.indexOf(hook);
  if (scriptIdx >= 0 && hookIdx >= 0 && scriptIdx > hookIdx) {
    return `it's set in the ${file.name}, which runs after the ${hook} — so on the first turn it doesn't exist yet when this line runs`;
  }
  if (scriptIdx >= 0 && file.name !== hook && file.name !== 'Library') {
    return `it's set in the ${file.name}, which only runs on its own turn stage, not in the ${hook}`;
  }
  // Walk out from the assignment: the first condition or function it sits in.
  for (let p = file.parent.get(node); p; p = file.parent.get(p)) {
    if (p.type === 'IfStatement') return `it's only set inside \`if (${src(file.code, p.test as Node, 60)})\` — that condition hasn't been true yet`;
    if (p.type === 'ConditionalExpression' || p.type === 'LogicalExpression') return 'it\'s only set in one branch of a condition, which wasn\'t the one taken';
    if (p.type === 'SwitchCase') return `it's only set in \`case ${p.test ? src(file.code, p.test as Node, 30) : 'default'}:\` of a switch, which wasn't matched`;
    if (p.type === 'ForStatement' || p.type === 'ForOfStatement' || p.type === 'ForInStatement' || p.type === 'WhileStatement') return 'it\'s only set inside a loop, which may have run zero times';
    if (p.type === 'CatchClause') return 'it\'s only set when an error is caught';
    if (isFunction(p)) {
      const name = functionName(file, p);
      if (name === 'modifier') break; // the hook body itself
      if (name) {
        return isCalled(files, name)
          ? `it's set inside ${name}(), so it only exists once ${name}() has run — check ${name}() is called before this line`
          : `it's set inside ${name}(), but nothing in your scripts calls ${name}()`;
      }
      return 'it\'s set inside a callback, which may not have run yet';
    }
  }
  if (file.name === failScript && node.start > failOffset) return 'it\'s set later in this script — after the line that needs it';
  return file.name === 'Library'
    ? 'the Library sets it before every hook — unless something later replaces or deletes it'
    : 'it should have been set before this — unless something later replaces or deletes it';
}

const toWhere = (a: Assignment, why: string): WhereSet => {
  const { line, column } = lineOf(a.node);
  return {
    script: a.file.name, line, column: column + 1,
    sourceLine: a.file.code.split('\n')[line - 1]?.trim() ?? '', why,
  };
};

// ------------------------------------------------------------------ main

const ARRAY_USES = new Set(['push', 'pop', 'shift', 'unshift', 'length', 'forEach', 'map', 'filter', 'find', 'some', 'every', 'includes', 'indexOf', 'join', 'slice', 'splice', 'reduce']);
const MAYBE_NOTHING = new Set(['find', 'findLast', 'pop', 'shift', 'at', 'get']);

/** The expression that was undefined, from where the engine said it failed. */
function findTarget(file: Parsed, input: TriangulateInput): Node | null {
  const offset = offsetOf(file.code, input.line, input.column);
  const lineStart = offsetOf(file.code, input.line, 1);
  const lineEnd = lineStartsOf(file.code)[input.line] ?? file.code.length;

  if (input.argIndex !== undefined) {
    const call = file.nodes.find(n => n.type === 'CallExpression' && n.start >= lineStart && n.start < lineEnd && isLogCallee(n.callee as Node));
    return call ? ((call.arguments as Node[])[input.argIndex] ?? null) : null;
  }
  const msg = input.message ?? '';
  if (/is not a function/.test(msg)) {
    const calls = file.nodes.filter(n => n.type === 'CallExpression' && n.start <= offset && offset <= n.end && n.start >= lineStart);
    calls.sort((a, b) => (a.end - a.start) - (b.end - b.start));
    return (calls[0]?.callee as Node) ?? null;
  }
  if (/is not iterable/.test(msg)) {
    const loop = file.nodes.find(n => n.type === 'ForOfStatement' && n.start >= lineStart && n.start < lineEnd);
    if (loop) return loop.right as Node;
  }
  // "Cannot read properties of undefined (reading 'x')": the member reading `x`
  // whose object is the undefined part. V8's column lands on that object (for
  // `state.player.hp` it points at `player`), or on the property — so match the
  // property name first and use the column only to pick among several.
  const prop = msg.match(/\((?:reading|setting) '(.+?)'\)/)?.[1];
  const reads = (n: Node) => {
    const p = n.property as Node;
    return n.computed ? p.type === 'Literal' && String(p.value) === prop : String(p.name) === prop;
  };
  const onLine = file.nodes.filter(n => n.type === 'MemberExpression' && n.start >= lineStart && n.start < lineEnd);
  if (prop !== undefined) {
    const named = onLine.filter(reads);
    const containing = named.filter(n => n.start <= offset && offset < n.end).sort((a, b) => (a.end - a.start) - (b.end - b.start));
    const hit = containing[0] ?? named[0];
    if (hit) return hit.object as Node;
  }
  // No property name (e.g. "Cannot set properties"): the member whose property sits at the column.
  const members = onLine.filter(n => (n.object as Node).end <= offset && offset < n.end);
  members.sort((a, b) => (a.end - a.start) - (b.end - b.start));
  return (members[0]?.object as Node) ?? null;
}

const isLogCallee = (c: Node) =>
  (c.type === 'Identifier' && c.name === 'log') ||
  (c.type === 'MemberExpression' && (c.object as Node).type === 'Identifier' && (c.object as Node).name === 'console');

/** The declaration (or parameter) a local name refers to at `at`. */
function bindingOf(file: Parsed, name: string, at: number): { kind: 'var'; node: Node; init: Node | null } | { kind: 'param'; fn: Node; index: number } | null {
  let best: Node | null = null;
  for (const n of file.nodes) {
    if (n.type === 'VariableDeclarator' && (n.id as Node).type === 'Identifier' && (n.id as Node).name === name && n.start < at) {
      // Must be in a scope that contains `at`.
      let scope = file.parent.get(n);
      while (scope && !isFunction(scope) && scope.type !== 'Program') scope = file.parent.get(scope);
      if (scope && scope.start <= at && at <= scope.end && (!best || n.start > best.start)) best = n;
    }
  }
  // A parameter of an enclosing function wins when it's closer than any declaration.
  for (const fn of file.nodes.filter(isFunction).filter(f => f.start <= at && at <= f.end).sort((a, b) => b.start - a.start)) {
    const i = (fn.params as Node[]).findIndex(p => p.type === 'Identifier' && p.name === name);
    if (i >= 0 && (!best || fn.start > best.start)) return { kind: 'param', fn, index: i };
  }
  return best ? { kind: 'var', node: best, init: (best.init as Node) ?? null } : null;
}

/** Default to create a missing value with, from how it's used. */
const defaultFor = (usedProp?: string) => (usedProp && ARRAY_USES.has(usedProp) ? '[]' : '{}');

export function triangulate(input: TriangulateInput): Triangulation | null {
  const files: Parsed[] = [];
  for (const s of input.scripts) {
    if (!s.code?.trim()) continue;
    const ast = parse(s.code);
    if (ast) files.push({ name: s.name, code: s.code, ast, ...index(ast) });
  }
  const file = files.find(f => f.name === input.script);
  if (!file) return null;
  const target = findTarget(file, input);
  if (!target) return null;

  const usedProp = input.message?.match(/\(reading '(.+?)'\)|\(setting '(.+?)'\)/)?.slice(1).find(Boolean);
  const failOffset = offsetOf(file.code, input.line, input.column);
  const targetText = src(file.code, target);
  const steps: TraceStep[] = [];
  const whereSet: WhereSet[] = [];
  const reasons: string[] = [];
  let suggestion: string | undefined;
  const isNull = /of null/.test(input.message ?? '');

  /** Explain a chain rooted at a global (state.x.y), checking the snapshot and where it's set. */
  const explainGlobalChain = (rootName: string, keys: (string | null)[], fullText: string) => {
    const root = snapshotRoot(rootName, input.snapshot);
    let missingPath = fullText;
    if (input.snapshot && root !== undefined) {
      const walk = walkSnapshot(rootName, root, keys);
      steps.push(...walk.steps);
      if (walk.missingAt !== undefined) {
        missingPath = pathText(rootName, keys.slice(0, walk.missingAt + 1));
        const parentText = pathText(rootName, keys.slice(0, walk.missingAt));
        reasons.push(`\`${missingPath}\` doesn't exist: \`${parentText}\` has no "${keys[walk.missingAt]}".`);
        if (walk.closeKey) reasons.push(`It does have "${walk.closeKey}" — did you mean \`${parentText}.${walk.closeKey}\`? Names must match exactly, capitals included.`);
      } else if (walk.nullAt !== undefined) {
        missingPath = pathText(rootName, keys.slice(0, walk.nullAt + 1));
        reasons.push(`\`${missingPath}\` exists but was set to null.`);
      } else if (keys.length) {
        reasons.push(`At the moment it failed, \`${fullText}\` exists — it was missing when this line ran and was created afterwards, or it was undefined only for part of the run.`);
      }
    }
    if (rootName !== 'state') return missingPath;
    // Where does the script create it?
    const assignments = allAssignments(files).filter(a => a.path === missingPath);
    for (const a of assignments) whereSet.push(toWhere(a, whyNotYet(a, files, input.hook, input.script, failOffset)));
    if (!assignments.length) {
      const allPaths = allAssignments(files).filter(a => a.path.startsWith('state.'));
      const last = missingPath.split('.').pop() ?? '';
      const parent = missingPath.slice(0, missingPath.length - last.length - 1);
      const near = closest(last, allPaths.filter(a => a.path.startsWith(parent + '.') && a.path.split('.').length === missingPath.split('.').length).map(a => a.path.split('.').pop()!));
      if (near) {
        const a = allPaths.find(x => x.path === `${parent}.${near}`)!;
        whereSet.push(toWhere(a, `this sets \`${parent}.${near}\`, not \`${missingPath}\` — check the spelling and capitals`));
        reasons.push(`Your scripts set \`${parent}.${near}\`, but this line reads \`${missingPath}\`.`);
      } else {
        reasons.push(`Nothing in your scripts ever creates \`${missingPath}\`.`);
      }
      // `[]` when the missing value is used like a list (push, length, …), else `{}`.
      suggestion = `${missingPath} = ${missingPath} || ${defaultFor(missingPath === fullText ? usedProp : undefined)};`;
    } else {
      reasons.push(`It is created in ${assignments.length === 1 ? 'one place' : `${assignments.length} places`}, but not before this line ran (see below).`);
      suggestion = `${missingPath} = ${missingPath} || ${defaultFor(missingPath === fullText ? usedProp : undefined)};`;
    }
    return missingPath;
  };

  /** Explain any expression node, following locals back to where they came from. */
  const explain = (node: Node, depth: number) => {
    if (depth > 3) return;
    const text = src(file.code, node);
    if (node.type === 'Identifier' || node.type === 'MemberExpression' || node.type === 'ChainExpression') {
      const { root, keys } = chainOf(node);
      if (root.type === 'Identifier' && GLOBALS.has(String(root.name))) {
        explainGlobalChain(String(root.name), keys, text);
        return;
      }
      if (root.type === 'Identifier') {
        const name = String(root.name);
        const b = bindingOf(file, name, node.start);
        if (!b) {
          reasons.push(`\`${name}\` isn't declared anywhere this line can see.`);
          return;
        }
        if (b.kind === 'param') {
          const fnName = functionName(file, b.fn) ?? 'this function';
          steps.push({ expr: name, status: 'from', detail: `parameter ${b.index + 1} of ${fnName}()` });
          reasons.push(`\`${name}\` is a parameter of ${fnName}(), so its value is whatever the caller passed.`);
          // Find the calls and what they pass.
          for (const f of files) {
            for (const call of f.nodes.filter(n => n.type === 'CallExpression' && (n.callee as Node).type === 'Identifier' && (n.callee as Node).name === fnName)) {
              const arg = (call.arguments as Node[])[b.index];
              const { line, column } = lineOf(call);
              whereSet.push({
                script: f.name, line, column: column + 1,
                sourceLine: f.code.split('\n')[line - 1]?.trim() ?? '',
                why: arg ? `passes \`${src(f.code, arg, 50)}\` for ${name} — check that it has a value here` : `calls ${fnName}() without a value for ${name}`,
              });
            }
          }
          if (!whereSet.length) reasons.push(`Nothing in your scripts calls ${fnName}() directly.`);
          return;
        }
        const decl = b.node;
        const { line } = lineOf(decl);
        if (!b.init) {
          steps.push({ expr: name, status: 'from', detail: `declared on line ${line} without a value` });
          reasons.push(`\`${name}\` is declared on line ${line} without a starting value.`);
          const assigns = allAssignments([file]).filter(a => a.path === name && a.node.start > decl.start);
          for (const a of assigns) whereSet.push(toWhere(a, whyNotYet(a, files, input.hook, input.script, failOffset)));
          if (!assigns.length) reasons.push(`Nothing gives it a value after that.`);
          suggestion = `let ${name} = ${defaultFor(usedProp)};`;
          return;
        }
        const init = b.init;
        steps.push({ expr: name, status: 'from', detail: `set on line ${line} from \`${src(file.code, init, 60)}\`` });
        if (keys.length === 0) {
          // `bag` itself is undefined — explain where bag came from.
          if (init.type === 'CallExpression') {
            const callee = init.callee as Node;
            if (callee.type === 'MemberExpression' && MAYBE_NOTHING.has(String((callee.property as Node).name))) {
              const method = String((callee.property as Node).name);
              const listText = src(file.code, callee.object as Node, 50);
              const listChain = chainOf(callee.object as Node);
              let size = '';
              if (listChain.root.type === 'Identifier' && GLOBALS.has(String(listChain.root.name)) && input.snapshot) {
                const walk = walkSnapshot(String(listChain.root.name), snapshotRoot(String(listChain.root.name), input.snapshot), listChain.keys);
                const last = walk.steps[walk.steps.length - 1];
                if (last) size = ` (\`${last.expr}\` is ${last.detail})`;
              }
              reasons.push(`\`${name}\` comes from \`${listText}.${method}(…)\`, which gives undefined when nothing matches${size}.`);
              suggestion = `if (${name}) { … }  // only use ${name} when ${method}() found something`;
              return;
            }
            if (callee.type === 'Identifier') {
              const fnName = String(callee.name);
              const fn = files.flatMap(f => f.nodes.filter(n => isFunction(n) && functionName(f, n) === fnName).map(n => ({ f, n })))[0];
              if (fn) {
                const returns = fn.f.nodes.filter(r => r.type === 'ReturnStatement' && r.start > fn.n.start && r.end <= fn.n.end && r.argument);
                const body = fn.n.body as Node;
                const lastStmt = body.type === 'BlockStatement' ? (body.body as Node[])[(body.body as Node[]).length - 1] : null;
                const { line: fl } = lineOf(fn.n);
                reasons.push(returns.length === 0
                  ? `\`${name}\` comes from ${fnName}(), which never returns a value — so it always gives undefined.`
                  : lastStmt && lastStmt.type !== 'ReturnStatement'
                    ? `\`${name}\` comes from ${fnName}() (${fn.f.name} line ${fl}), which only returns a value on some paths — this time it reached the end without returning.`
                    : `\`${name}\` comes from ${fnName}() (${fn.f.name} line ${fl}), which returned undefined this time.`);
                return;
              }
            }
          }
          explain(init, depth + 1);
          return;
        }
        // `bag.items` is undefined — the problem is inside bag; follow bag's source.
        const initChain = chainOf(init);
        if (initChain.root.type === 'Identifier' && GLOBALS.has(String(initChain.root.name))) {
          explainGlobalChain(String(initChain.root.name), [...initChain.keys, ...keys], `${src(file.code, init)}${pathText('', keys)}`);
          return;
        }
        reasons.push(`\`${text}\` is missing on \`${name}\` (set on line ${line}).`);
        return;
      }
    }
    if (node.type === 'CallExpression') {
      reasons.push(`\`${text}\` returned undefined.`);
    }
  };

  explain(target, 0);
  if (!reasons.length && !steps.length) return null;

  return {
    target: targetText,
    steps,
    reason: reasons.join(' ') || `\`${targetText}\` was ${isNull ? 'null' : 'undefined'} when this line ran.`,
    whereSet: whereSet.slice(0, 6),
    suggestion,
  };
}
