import { parse as acornParse, tokenizer, tokTypes as tt, type Token } from 'acorn';
import { WorldState, HistoryEntry } from '../types';

// The documented AID scripting API surface (per AID-Docs 01-scripting/api),
// plus this sandbox's own whitelisted helpers. Used by the validator to flag
// references to globals that aren't part of the real API.
export const AID_GLOBALS = [
  // Real AID globals available in every hook.
  'text', 'state', 'info', 'history', 'storyCards', 'memory', 'stop', 'log',
  // Story Card API (and its legacy aliases).
  'addStoryCard', 'updateStoryCard', 'removeStoryCard',
  'addWorldEntry', 'updateWorldEntry', 'removeWorldEntry',
  // Legacy/executor-provided values kept for compatibility.
  'worldState', 'input', 'console',
];

// The Story Card API bound to a given `storyCards` array. Kept as a standalone,
// exported factory (not inlined in the worker string) for two reasons: the worker
// embeds it via `.toString()` so there is a single source of truth, and tests can
// exercise the real implementation directly instead of a stub.
//   addStoryCard is a faithful copy of the platform function (captured via
//   addStoryCard.toString()): signature, field mapping (name->title,
//   notes->description), and return value (new length, or the card itself when
//   options.returnCard). Pushed cards are enriched with createdAt/updatedAt/
//   useForCharacterCreation so those aren't undefined when a script reads a card back.
//   updateStoryCard(index, keys, entry, type) mutates in place and throws when the
//   index does not exist — matching AID. removeStoryCard splices, also throwing on
//   a bad index.
export function createStoryCardApi(storyCards: any[]) {
  const addStoryCard = (keys: any, entry: any, type = 'Custom', name = keys, notes = '', options?: any) => {
    const { returnCard = false } = options ?? {};
    const now = new Date().toISOString();
    storyCards.push({
      id: Math.floor(Math.random() * 1000000000).toString(),
      keys, entry, type, title: name, description: notes,
      createdAt: now, updatedAt: now, useForCharacterCreation: false,
    });
    if (returnCard) return storyCards[storyCards.length - 1];
    else return storyCards.length;
  };
  const updateStoryCard = (index: number, keys: any, entry: any, type?: any) => {
    const card = storyCards[index];
    if (!card) throw new Error('Story card at index ' + index + ' does not exist');
    card.keys = keys;
    card.entry = entry;
    if (type !== undefined) card.type = type;
    card.updatedAt = new Date().toISOString();
  };
  const removeStoryCard = (index: number) => {
    if (!storyCards[index]) throw new Error('Story card at index ' + index + ' does not exist');
    storyCards.splice(index, 1);
  };
  // Legacy aliases (addWorldEntry/updateWorldEntry/removeWorldEntry).
  const addWorldEntry = (keys: any, entry: any, type?: any) => addStoryCard(keys, entry, type);
  const updateWorldEntry = (index: number, keys: any, entry: any) => updateStoryCard(index, keys, entry);
  const removeWorldEntry = (index: number) => removeStoryCard(index);
  return { addStoryCard, updateStoryCard, removeStoryCard, addWorldEntry, updateWorldEntry, removeWorldEntry };
}

export const runOfflineSimulation = async (
  code: string,
  worldState: WorldState,
  input: string,
  isModifierScript: boolean,
  hookName = 'Unknown Hook',
  history: HistoryEntry[] = [],
  hookCode?: string,
  libraryLineCount: number = 0,
): Promise<{
  newState: WorldState;
  logs: unknown[];
  // AID accepts either `{ text }` or a bare string from a modifier, so the raw
  // return is passed through as-is; callers normalize via normalizeModifierResult.
  result: { text?: string; stop?: boolean } | string | null;
  // Present only when execution threw. The caller uses this to halt the
  // pipeline (the engine stops) and paint the error surface red. `details`
  // carries the code-level follow-up (the failing source line, or the
  // validator's full suggestion list) — never shown automatically.
  error?: { hook: string; line: string; message: string; details?: string } | null;
}> => {
  const rejected = (hook: string, line: number, message: string, details: string) => ({
    newState: worldState,
    logs: [`[ERROR] ${hook}${line > 0 ? `, line ${line}` : ''}: ${message}`],
    result: null,
    error: { hook, line: line > 0 ? String(line) : 'unknown', message, details },
  });
  const detailsFor = (error: ValidationError) =>
    formatValidationResults({ valid: false, errors: [error], warnings: [] });

  // Check the hook and the Library apart so each error's line matches the file the
  // editor shows, then the two together: only the bundle can reveal a name declared in both.
  const validation = validateScriptSyntax(hookCode || code, isModifierScript);
  if (!validation.valid) {
    const [first] = validation.errors;
    return rejected(hookName, first.line, first.message, formatValidationResults(validation));
  }
  if (hookCode) {
    const libraryCode = code.slice(0, code.length - hookCode.length);
    const libraryError = libraryCode.trim() ? diagnoseSyntax(libraryCode) : null;
    if (libraryError) {
      return rejected('Library', libraryError.line, libraryError.message, detailsFor(libraryError));
    }
    const bundleError = diagnoseSyntax(code);
    if (bundleError) {
      const hookLine = bundleError.line - (libraryCode.split('\n').length - 1);
      return hookLine > 0
        ? rejected(hookName, hookLine, bundleError.message, detailsFor(bundleError))
        : rejected('Library', bundleError.line, bundleError.message, detailsFor(bundleError));
    }
  }

  const workerCode = `
    self.onmessage = function(e) {
      const { code, hookCode, worldState, input, isModifierScript, hookName, history: turnHistory, libraryLineCount = 0 } = e.data;
      // Tell the host the script is about to run, so its watchdog can time the
      // script rather than the worker's startup (see the timeout below).
      self.postMessage({ status: 'started' });
      const logs = [];
      
      // No pre-execution state dump: AID's log shows only what the script itself
      // logs, and the before/after world state is already captured structurally
      // (scriptingService snapshots it either side of the run and the State Editor
      // renders the delta), so dumping it here only buried the script's own output.

      const _locateUndefined = (args) => {
        if (!args.some(a => a === undefined)) return '';
        try {
          const stack = new Error().stack || '';
          const re = /userscript\\.js:(\\d+)/g;
          let fm;
          while ((fm = re.exec(stack)) !== null) {
            const rel = Number(fm[1]) - hookLineOffset;
            if (rel >= 1) {
              const src = (execCode.split(String.fromCharCode(10))[rel - 1] || '').trim();
              return '  [undefined at hook line ' + rel + (src ? ': ' + src.substring(0, 120) : '') + ']';
            }
          }
        } catch(e) {}
        return '';
      };
      const console = {
        log: (...args) => {
          const formatted = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a));
          logs.push(formatted.join(' ') + _locateUndefined(args));
        },
        error: (...args) => {
          const formatted = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a));
          logs.push(['ERROR:', ...formatted].join(' ') + _locateUndefined(args));
        }
      };
      // Hoisted so the catch block can attribute the error: execCode is the
      // hook's own source (after the trailing modifier(text) rewrite), and
      // hookLineOffset is how many wrapped lines precede the hook's line 1.
      var execCode = '', hookLineOffset = 0;
      try {
        const text = input;
        const state = worldState;
        const history = turnHistory || [];

        // Real AID scripting globals (per AID-Docs 01-scripting/api). These were
        // previously missing from the sandbox; add them so scripts written to the
        // documented API run. Derive safe defaults so undefined access never throws.
        // AID's read-only \`info\`. actionCount tracks how many actions the story
        // has taken — engines diff it against a stored value to detect a new turn
        // (CounterUpdate-style logic), so it must grow as history does. maxChars
        // is the context budget scripts trim against; leaving it undefined turned
        // every \`ctx.length - info.maxChars\` overflow calculation into NaN.
        const info = Object.assign(
          { actionCount: (history.length || 0), characters: [], maxChars: 8192 },
          worldState.info || {}
        );
        const storyCards = Array.isArray(worldState.storyCards) ? worldState.storyCards : (worldState.storyCards = []);
        const memory = worldState.memory || (state.memory = state.memory || {});
        let stop = false;
        const log = (...args) => console.log(...args);

        // ── AID Story Card API ──────────────────────────────────────────────
        // The Story Card API, embedded from the single source of truth
        // (createStoryCardApi) so the worker and the tests run identical code.
        const { addStoryCard, updateStoryCard, removeStoryCard, addWorldEntry, updateWorldEntry, removeWorldEntry } =
          (${createStoryCardApi.toString()})(storyCards);

        // No extractSections/splatContext/unsplatContext here. AID does not provide
        // them — they are library functions scenario authors write themselves (the
        // fixture defines all three in Library.js). Injecting copies meant the
        // sandbox shipped a hardcoded guess at the context heading literals, which
        // is exactly the thing the assembled context must be free to define.

        execCode = hookCode || code;
        if (isModifierScript) {
            // Rewrite the trailing modifier(text) call on the HOOK's own code
            // (execCode = hookCode || code), never on the full bundle: "code" is
            // Library + hook, so replacing against "code" made execCode the whole
            // bundle while the Library is ALSO prepended separately below as
            // libraryPart — the Library was embedded twice in the wrapped
            // function, every top-level const/let in it (e.g. the RPG engine
            // Library's "const Say") was declared twice, and the run died with
            // "Identifier 'X' has already been declared" before the hook's
            // first line ever ran.
            execCode = execCode.replace(/modifier\\s*\\(\\s*text\\s*\\)\\s*;?\\s*$/, 'return modifier(text);');
        }

        const libraryPart = hookCode ? code.slice(0, -hookCode.length) : '';
        const wrapperHeader = '(function(worldState, input, text, state, console, history, info, storyCards, memory, stop, log, addStoryCard, updateStoryCard, removeStoryCard, addWorldEntry, updateWorldEntry, removeWorldEntry) {\\n';
        const wrappedCode = wrapperHeader + libraryPart + '\\n' + execCode + '\\n})\\n//# sourceURL=userscript.js\\n';
        // Wrapped lines before the hook's line 1. The catch block maps
        // userscript.js stack lines back onto the hook's own script with this.
        // Line attribution comes from the stack (the sourceURL tag names every
        // frame of the wrapped function) rather than injected "_ln = N;"
        // statements: injecting a statement before EVERY line corrupted any
        // multi-line construct — object literals, argument lists — into a
        // SyntaxError before the script could even run.
        hookLineOffset = (wrapperHeader + libraryPart + '\\n').split('\\n').length - 1;
        const fn = eval(wrappedCode);
        const result = fn(worldState, input, text, state, console, history, info, storyCards, memory, stop, log, addStoryCard, updateStoryCard, removeStoryCard, addWorldEntry, updateWorldEntry, removeWorldEntry);

        // Report what the hook actually returned, using the same coercion the
        // pipeline applies (normalizeModifierResult). Two things were wrong with
        // reading result?.text and testing it for truthiness:
        //
        //   - AID accepts a bare string return, and real Context Modifiers use it
        //     (\`return text\`). Those have no .text, so a hook that returned the
        //     whole context logged "None" as if it had returned nothing.
        //   - An empty string is a legitimate return (an Output Modifier blanking
        //     the text). Truthiness reported that as "None" too.
        //
        // Both made the log claim text was dropped when it had been passed on.
        var returnedText =
          typeof result === 'string' ? result
          : (result && typeof result === 'object' && typeof result.text === 'string') ? result.text
          : undefined;
        logs.push('[DEBUG] Modified Text: ' + (
          returnedText === undefined
            ? 'None (hook returned no text — the incoming text passes through unchanged)'
            : JSON.stringify(returnedText)
        ));
        // Propagate the AID stop flag (return { text, stop: true }) so command-style
        // scripts can halt generation.
        if (result && typeof result === 'object' && 'stop' in result) {
          logs.push('[DEBUG] stop flag: ' + result.stop);
        }
        
        self.postMessage({ status: 'success', newState: worldState, logs, result });
      } catch (err) {
        const message = err.message || String(err);
        // Attribute the throw to the first userscript.js stack frame inside the
        // hook's own code: an error thrown from a Library function lands on the
        // hook line that called it — the line the editor can show. Frames in
        // the Library preamble (before the hook region) are skipped; when none
        // is in the hook, the line is reported as unknown.
        let lineNumber = 'unknown';
        let sourceLine = '';
        if (err && err.stack) {
          const frameRe = /userscript\\.js:(\\d+)/g;
          let fm;
          while ((fm = frameRe.exec(err.stack)) !== null) {
            const rel = Number(fm[1]) - hookLineOffset;
            if (rel >= 1) {
              lineNumber = String(rel);
              sourceLine = (execCode.split(String.fromCharCode(10))[rel - 1] || '').trim();
              break;
            }
          }
        }

        logs.push('[ERROR] ' + hookName + (lineNumber !== 'unknown' ? ', line ' + lineNumber : '') + ': ' + message);
        self.postMessage({ status: 'error', logs, result: null, error: { hook: hookName, line: lineNumber, message: message, details: sourceLine ? lineNumber + ' | ' + sourceLine : undefined } });
      }
    };
  `;

  return new Promise((resolve) => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    // Two separate budgets, because the old single 1000ms one measured the wrong
    // thing. It started at `new Worker(...)`, so it was really covering: spawning
    // a worker, structured-cloning the whole world state in, parsing a ~280KB
    // Library, running the script, cloning the state back, and the main thread
    // being free enough to service the reply. Measured script execution for the
    // RPG engine is 1-7ms; the rest of that list is what actually blew the
    // budget, and it blows it hardest on a phone and on the largest turns —
    // which is exactly where "Execution timed out" was being reported for
    // scripts that had, in fact, already finished.
    //
    // STARTUP_MS covers everything up to the script beginning; the worker posts
    // `started` at that moment and the clock restarts on EXECUTION_MS, which is
    // the real runaway-script guard.
    const STARTUP_MS = 15_000;
    const EXECUTION_MS = 10_000;

    let timeout: ReturnType<typeof setTimeout>;
    const failWith = (message: string) => {
      worker.terminate();
      resolve({
        newState: worldState,
        logs: [`[ERROR] ${hookName}: ${message}`],
        result: null,
        error: { hook: hookName, line: 'unknown', message },
      });
      URL.revokeObjectURL(url);
    };

    const arm = (ms: number, message: string) => {
      timeout = setTimeout(() => failWith(message), ms);
    };
    arm(STARTUP_MS, `Worker did not start within ${STARTUP_MS}ms`);

    worker.onmessage = (e) => {
      // Handshake, not a result: the script just began. Restart the clock so a
      // slow start can't be reported as a slow script.
      if (e.data?.status === 'started') {
        clearTimeout(timeout);
        arm(EXECUTION_MS, `Execution timed out after ${EXECUTION_MS}ms`);
        return;
      }

      clearTimeout(timeout);
      const { status, newState, logs, result, error } = e.data;
      resolve({
        newState: status === 'success' ? newState : worldState,
        logs: logs || [],
        result,
        error: status === 'error' ? (error ?? { hook: hookName, line: 'unknown', message: 'Execution error' }) : null,
      });
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    worker.onerror = (e) => {
      clearTimeout(timeout);
      resolve({
        newState: worldState,
        logs: [`[ERROR] ${hookName}: ${e.message}`],
        result: null,
        error: { hook: hookName, line: 'unknown', message: e.message },
      });
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    // Hand scripts AID's exact `{ text, type, rawText }` — `turn` is an Atlas-only
    // annotation for the State Editor and must not appear on the `history` global.
    const aidHistory = history.map(({ text, type, rawText }) => ({ text, type, rawText }));
    worker.postMessage({ code, hookCode, worldState: JSON.parse(JSON.stringify(worldState)), input, isModifierScript, hookName, history: aidHistory, libraryLineCount });
  });
};

// ======================== COMPREHENSIVE CODE VALIDATOR ========================

interface ValidationError {
  type: string;
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  codeSnippet: string;
  context: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Helper to get line of code
function getLineOfCode(code: string, lineNumber: number): string {
  return code.split('\n')[lineNumber - 1] || '';
}

// Helper to show context with caret
function getContextWithCaret(code: string, line: number, column: number, contextLines: number = 1): string {
  const lines = code.split('\n');
  const start = Math.max(0, line - 1 - contextLines);
  const end = Math.min(lines.length, line + contextLines);

  let context = '\n';
  for (let i = start; i < end; i++) {
    const lineNum = String(i + 1).padStart(4, ' ');
    const marker = i === line - 1 ? '❌ ' : '   ';
    context += `${marker}${lineNum} | ${lines[i]}\n`;
    
    if (i === line - 1 && column > 0) {
      context += `     ${' '.repeat(Math.max(0, column - 1))}^\n`;
    }
  }
  return context;
}

// True if the two strings differ by exactly one insertion, deletion, or
// substitution (Levenshtein distance of 1). Used to catch typos of AID globals.
function isEditDistanceOne(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  if (i < la || j < lb) edits++;
  return edits === 1;
}

const ACORN_OPTIONS = {
  ecmaVersion: 'latest',
  sourceType: 'script',
  allowReturnOutsideFunction: true,
  locations: true,
} as const;

const acornError = (code: string): (Error & { loc?: { line: number; column: number } }) | null => {
  try {
    acornParse(code, ACORN_OPTIONS);
    return null;
  } catch (err) {
    return err as Error & { loc?: { line: number; column: number } };
  }
};

const CLOSER_OF: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
const OPENER_TOKENS = new Map([
  [tt.braceL, '{'], [tt.dollarBraceL, '{'], [tt.parenL, '('], [tt.bracketL, '['],
]);
const CLOSER_TOKENS = new Map([[tt.braceR, '}'], [tt.parenR, ')'], [tt.bracketR, ']']]);

// Each repair is re-parsed, so this bounds the work done per keystroke on a broken file.
const MAX_REPAIR_ATTEMPTS = 6;

interface OpenBracket { char: string; line: number; column: number }

interface BracketSuspect {
  // Missing: `text` is inserted at `pos`. Extra: the one character at `pos` is deleted.
  kind: 'missing' | 'extra';
  text: string;
  pos: number;
  line: number;
  column: number;
  opener?: OpenBracket;
}

// A parser only notices a missing } where the code stops making sense, which can
// be the end of the file. Indentation still shows where a block was meant to end,
// so walk the real tokens and flag where the two disagree. The tokenizer (unlike a
// character scan) is not fooled by comments, strings or regex literals.
function findBracketSuspects(code: string): { suspects: BracketSuspect[]; balanced: boolean } | null {
  const sourceLines = code.split('\n');
  const indentOf = (line: number) => sourceLines[line - 1].match(/^[ \t]*/)![0].length;
  const stack: OpenBracket[] = [];
  const flagged = new Set<OpenBracket>();
  const suspects: BracketSuspect[] = [];
  let balanced = true;
  let prev: Token | null = null;

  const flagMissing = (opener: OpenBracket) => {
    if (flagged.has(opener) || !prev?.loc) return;
    flagged.add(opener);
    suspects.push({
      kind: 'missing',
      text: CLOSER_OF[opener.char],
      pos: prev.end,
      line: prev.loc.end.line,
      column: prev.loc.end.column + 1,
      opener,
    });
  };
  const flagExtra = (tok: Token, char: string) => {
    if (!tok.loc) return;
    suspects.push({ kind: 'extra', text: char, pos: tok.start, line: tok.loc.start.line, column: tok.loc.start.column + 1 });
  };

  try {
    for (const tok of tokenizer(code, ACORN_OPTIONS)) {
      if (!tok.loc) continue;
      const line = tok.loc.start.line;
      const closer = CLOSER_TOKENS.get(tok.type);
      const opener = OPENER_TOKENS.get(tok.type);
      const top = stack[stack.length - 1];
      const firstOnLine = !prev?.loc || prev.loc.end.line < line;

      if (top && firstOnLine && line > top.line) {
        const indent = indentOf(line);
        const topIndent = indentOf(top.line);
        // `case` is commonly written level with its `switch`.
        const isCaseLabel = tok.type === tt._case || tok.type === tt._default;
        if (closer ? indent < topIndent : indent <= topIndent && !isCaseLabel) flagMissing(top);
        else if (closer && indent > topIndent && CLOSER_OF[top.char] === closer) flagExtra(tok, closer);
      }

      if (closer) {
        if (top && CLOSER_OF[top.char] === closer) {
          stack.pop();
        } else {
          balanced = false;
          let match = stack.length - 1;
          while (match >= 0 && CLOSER_OF[stack[match].char] !== closer) match--;
          if (match < 0) {
            flagExtra(tok, closer);
          } else {
            for (let i = stack.length - 1; i > match; i--) flagMissing(stack[i]);
            stack.length = match;
          }
        }
      } else if (opener) {
        stack.push({ char: opener, line, column: tok.loc.start.column + 1 });
      }
      prev = tok;
    }
  } catch {
    // An unterminated string or regex stops the tokenizer; the parser's own message covers those.
    return null;
  }

  if (stack.length > 0) {
    balanced = false;
    for (let i = stack.length - 1; i >= 0; i--) flagMissing(stack[i]);
  }
  return { suspects, balanced };
}

const applyRepair = (code: string, suspect: BracketSuspect) =>
  suspect.kind === 'missing'
    ? code.slice(0, suspect.pos) + suspect.text + code.slice(suspect.pos)
    : code.slice(0, suspect.pos) + code.slice(suspect.pos + 1);

function describeSuspect(code: string, suspect: BracketSuspect, confirmed: boolean): ValidationError {
  const { kind, text, line, column, opener } = suspect;
  const message = kind === 'extra'
    ? `Extra ${text} on line ${line}: nothing is open for it to close. Remove it, or add the missing opening bracket above it.`
    : confirmed
      ? `Missing ${text}: the ${opener!.char} opened on line ${opener!.line} is never closed. Add ${text} after line ${line}.`
      : `Possibly missing ${text}: the ${opener!.char} opened on line ${opener!.line} doesn't look closed. Check around line ${line}.`;
  return {
    type: kind === 'extra' ? 'EXTRA_BRACKET' : 'MISSING_BRACKET',
    message,
    line,
    column,
    severity: 'error',
    codeSnippet: getLineOfCode(code, line),
    context: (opener ? getContextWithCaret(code, opener.line, opener.column, 0) : '') + getContextWithCaret(code, line, column),
  };
}

// The one syntax error worth reporting. The JS engine decides whether the code is
// valid; acorn says where, because V8's SyntaxError carries no line for evaluated code.
export const diagnoseSyntax = (code: string): ValidationError | null => {
  let engineMessage: string;
  try {
    new Function(code);
    return null;
  } catch (err) {
    engineMessage = (err as Error).message;
  }

  const parseError = acornError(code);
  if (!parseError?.loc) {
    return {
      type: 'SYNTAX_ERROR', message: engineMessage, line: 0, column: 0, severity: 'error', codeSnippet: '', context: '',
    };
  }

  const scan = findBracketSuspects(code);
  if (scan) {
    const confirmed = scan.suspects
      .slice(0, MAX_REPAIR_ATTEMPTS)
      .find(s => !acornError(applyRepair(code, s)));
    if (confirmed) return describeSuspect(code, confirmed, true);
    // Indentation alone can't blame a bracket when the brackets all pair up.
    if (!scan.balanced && scan.suspects.length > 0) return describeSuspect(code, scan.suspects[0], false);
  }

  const { line, column } = parseError.loc;
  return {
    type: 'SYNTAX_ERROR',
    message: parseError.message.replace(/\s*\(\d+:\d+\)$/, ''),
    line,
    column: column + 1,
    severity: 'error',
    codeSnippet: getLineOfCode(code, line),
    context: getContextWithCaret(code, line, column + 1),
  };
};

export const validateScriptSyntax = (code: string, isModifierScript = false, hookCode?: string): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const lines = code.split('\n');

  // NOTE: Library-to-hook redeclaration detection was removed. Top-level
  // `const`/`let` collisions between a script and the bundled Library are not
  // a runtime error in AID — each script is evaluated in its own scope, and
  // mock/test scripts frequently shadow Library names without ill effect.
  // The JS engine (or the runtime error path) is the source of truth for
  // actual redeclaration failures, so we no longer pre-emptively flag them.

  // ============ COMMON TYPOS & PATTERNS ============
  const checkCommonErrors = () => {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Assignment in condition
      const assignMatch = line.match(/\bif\s*\(\s*\w+\s*=\s*[^=]/);
      if (assignMatch) {
        const column = line.indexOf(assignMatch[0]) + assignMatch[0].indexOf('=') + 1;
        warnings.push({
          type: 'ASSIGNMENT_IN_CONDITION',
          message: `Using assignment (=) instead of comparison (===)`,
          line: lineNum,
          column,
          severity: 'warning',
          codeSnippet: line,
          context: getContextWithCaret(code, lineNum, column)
        });
      }

      // Loose equality
      const looseEqMatch = line.match(/[^=!<>]==[^=]/);
      if (looseEqMatch && !line.includes('===')) {
        const column = line.indexOf(looseEqMatch[0]) + 1;
        warnings.push({
          type: 'LOOSE_EQUALITY',
          message: `Using loose equality (==) - consider === instead`,
          line: lineNum,
          column,
          severity: 'warning',
          codeSnippet: line,
          context: getContextWithCaret(code, lineNum, column)
        });
      }

      // for...in on arrays
      if (/for\s*\(\s*(?:let|const|var)\s+\w+\s+in\s+/.test(line)) {
        const column = line.indexOf('for');
        warnings.push({
          type: 'LOOP_PATTERN',
          message: `Using for...in - consider for...of for arrays`,
          line: lineNum,
          column,
          severity: 'warning',
          codeSnippet: line,
          context: getContextWithCaret(code, lineNum, column)
        });
      }
    });
  };

  // ============ AID SCRIPTING API VALIDATION ============
  // Flag member access on globals that don't exist in the documented AID API,
  // and warn when a modifier script never returns an object with `text`.
  const checkAidApi = () => {
    // Collect identifiers the user declared locally so we don't flag their own
    // variables/functions as "undocumented globals".
    const declared = new Set<string>();
    const declRe = /\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g;
    let dm: RegExpExecArray | null;
    while ((dm = declRe.exec(code)) !== null) declared.add(dm[1]);

    const allowed = new Set(AID_GLOBALS);
    // A member expression like `foo.bar` where `foo` looks like a top-level
    // global (not declared locally, not an allowed global) → likely a typo of a
    // real AID global (e.g. `stat.x` instead of `state.x`).
    const memberRe = /(?<![.\w$])([A-Za-z_$][\w$]*)\s*\./g;
    lines.forEach((line, idx) => {
      // Skip comment lines cheaply.
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      let m: RegExpExecArray | null;
      memberRe.lastIndex = 0;
      while ((m = memberRe.exec(line)) !== null) {
        const ident = m[1];
        // Only flag identifiers that resemble the real globals (lowercase-ish,
        // single word) but aren't recognized or declared.
        if (allowed.has(ident) || declared.has(ident)) continue;
        // Ignore obviously-JS builtins/objects to avoid noise.
        if (['this', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'console', 'window', 'globalThis'].includes(ident)) continue;
        // Heuristic: only warn for identifiers close to a known global name
        // (edit-distance 1) so we catch typos without flagging unrelated locals.
        const near = AID_GLOBALS.find(g => isEditDistanceOne(g, ident));
        if (near) {
          const column = m.index + 1;
          warnings.push({
            type: 'UNDOCUMENTED_API',
            message: `"${ident}" is not a documented AID global — did you mean "${near}"?`,
            line: idx + 1,
            column,
            severity: 'warning',
            codeSnippet: line,
            context: getContextWithCaret(code, idx + 1, column)
          });
        }
      }
    });

    // Modifier scripts should return an object containing `text`.
    if (isModifierScript && !/return\s*{[^}]*\btext\b/.test(code) && !/modifier\s*\(/.test(code)) {
      warnings.push({
        type: 'MISSING_RETURN',
        message: `Modifier scripts should return an object with a "text" property (e.g. "return { text };").`,
        line: lines.length,
        column: 1,
        severity: 'warning',
        codeSnippet: lines[lines.length - 1] || '',
        context: ''
      });
    }
  };

  const syntaxError = diagnoseSyntax(code);
  if (syntaxError) errors.push(syntaxError);

  // Semantic checks run regardless — they don't depend on the code parsing.
  checkCommonErrors();
  checkAidApi();

  return {
    valid: errors.length === 0,
    errors: errors.sort((a, b) => a.line - b.line),
    warnings: warnings.sort((a, b) => a.line - b.line)
  };
};

// Format validation results for beautiful display
export const formatValidationResults = (result: ValidationResult): string => {
  if (result.valid && result.errors.length === 0 && result.warnings.length === 0) {
    return '✅ Code validation passed - no errors detected!';
  }

  let output = '';

  if (result.errors.length > 0) {
    output += `🔴 ERRORS (${result.errors.length}):\n`;
    output += '─'.repeat(70) + '\n';
    result.errors.forEach((err, idx) => {
      output += `\n${idx + 1}. [${err.type}] Line ${err.line}, Column ${err.column}\n`;
      output += `   📍 ${err.message}\n`;
      output += `   Code: ${err.codeSnippet.trim()}\n`;
      output += err.context;
    });
    output += '\n';
  }

  if (result.warnings.length > 0) {
    output += `🟡 WARNINGS (${result.warnings.length}):\n`;
    output += '─'.repeat(70) + '\n';
    result.warnings.forEach((warn, idx) => {
      output += `\n${idx + 1}. [${warn.type}] Line ${warn.line}, Column ${warn.column}\n`;
      output += `   ⚠️  ${warn.message}\n`;
      output += `   Code: ${warn.codeSnippet.trim()}\n`;
    });
  }

  return output;
};
