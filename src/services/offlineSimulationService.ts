import { parse as acornParse, tokenizer, tokTypes as tt, type Token } from 'acorn';
import { WorldState, HistoryEntry, ExecutionError } from '../types';
import type { RuntimeSnapshot } from './errors/triangulate';

/** An error the script caught and console.error'd, located by the worker. */
export interface CaughtInWorker {
  message: string;
  script: string;
  line: number | null;
  column: number | null;
  sourceLine: string;
  /** Runtime values at that moment, for undefined/null-type errors. */
  snapshot?: RuntimeSnapshot;
}

/** A log() call that printed undefined: where, which arguments, and the runtime values then. */
export interface UndefinedLogInWorker {
  script: string;
  line: number;
  column: number;
  sourceLine: string;
  args: number[];
  snapshot?: RuntimeSnapshot;
}

/**
 * Locate the clashing declaration behind "Identifier 'x' has already been
 * declared". eval throws that before any stack frame exists, so it arrives
 * without a line. Prefers the hook's declaration — the Library's is usually
 * the one meant to stay — and reports the other one as `calledFrom`.
 */
export function locateRedeclaration(
  error: ExecutionError, code: string, hookCode: string | undefined, libraryName: string,
): ExecutionError | null {
  const name = error.message.match(/Identifier '(.+?)' has already been declared/)?.[1];
  if (!name) return null;
  const esc = name.replace(/[$]/g, (c) => '\\' + c);
  const re = new RegExp('(?:^|[^\\w$.])(?:let|const|var|function|class)\\s+' + esc + '(?![\\w$])');
  const find = (src: string) => {
    const hits: { line: number; column: number; text: string }[] = [];
    src.split('\n').forEach((l, i) => {
      const m = re.exec(l);
      if (m) hits.push({ line: i + 1, column: m.index + (m[0].length - m[0].trimStart().length) + 1, text: l.trim() });
    });
    return hits;
  };
  const hook = hookCode ?? code;
  const library = hookCode ? code.slice(0, code.length - hookCode.length) : '';
  const inHook = find(hook);
  const inLib = find(library);
  let target: { script: string; hit: { line: number; column: number; text: string } } | null = null;
  if (inHook.length && inLib.length) target = { script: error.hook, hit: inHook[0] };
  else if (inHook.length > 1) target = { script: error.hook, hit: inHook[1] };
  else if (inLib.length > 1) target = { script: libraryName, hit: inLib[1] };
  if (!target) return null;
  const other = target.script === libraryName ? inLib[0] : inLib[0] ?? inHook[0];
  return {
    ...error,
    script: target.script,
    line: String(target.hit.line),
    column: target.hit.column,
    sourceLine: target.hit.text,
    calledFrom: other && other !== target.hit
      ? { script: inLib[0] ? libraryName : error.hook, line: other.line, column: other.column, sourceLine: other.text }
      : undefined,
  };
}

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
  // Unused since errors are located from stack frames; kept for call-site compatibility.
  _libraryLineCount: number = 0,
  /** What to call the code ahead of the hook in error locations. */
  libraryName = 'Library',
  /**
   * Hook-specific `info` fields, merged over the defaults. The Context hook gets
   * `memoryLength` here (AID only provides it there).
   */
  infoExtra: Record<string, unknown> = {},
): Promise<{
  newState: WorldState;
  logs: unknown[];
  // AID accepts either `{ text }` or a bare string from a modifier, so the raw
  // return is passed through as-is; callers normalize via normalizeModifierResult.
  result: { text?: string; stop?: boolean } | string | null;
  // Present only when execution threw (or failed to parse). The caller uses this
  // to halt the pipeline and paint the error surface red. `script`/`line`/
  // `column` locate the failing line in the script the editor shows — the
  // Library when that is where it broke — and `calledFrom` the hook line that
  // led there.
  error?: ExecutionError | null;
  /** Errors the script caught and reported with console.error, located. */
  caught: CaughtInWorker[];
  /** log() calls that printed undefined, located, with a runtime snapshot. */
  undefinedLogs?: UndefinedLogInWorker[];
}> => {
  const rejected = (script: string, line: number, message: string, details: string, column?: number, source?: string) => ({
    newState: worldState,
    logs: [`[ERROR] ${script}${line > 0 ? `, line ${line}` : ''}: ${message}`],
    result: null,
    caught: [],
    error: {
      hook: hookName, script, line: line > 0 ? String(line) : 'unknown', message, details,
      column: column && column > 0 ? column : undefined,
      sourceLine: line > 0 && source ? (source.split('\n')[line - 1] ?? '').trim() : undefined,
      kind: 'syntax' as const,
    },
  });
  const detailsFor = (error: ValidationError) =>
    formatValidationResults({ valid: false, errors: [error], warnings: [] });

  // Check the hook and the Library apart so each error's line matches the file the
  // editor shows, then the two together: only the bundle can reveal a name declared in both.
  const validation = validateScriptSyntax(hookCode || code, isModifierScript);
  if (!validation.valid) {
    const [first] = validation.errors;
    return rejected(hookName, first.line, first.message, formatValidationResults(validation), first.column, hookCode || code);
  }
  if (hookCode) {
    const libraryCode = code.slice(0, code.length - hookCode.length);
    const libraryError = libraryCode.trim() ? diagnoseSyntax(libraryCode) : null;
    if (libraryError) {
      return rejected(libraryName, libraryError.line, libraryError.message, detailsFor(libraryError), libraryError.column, libraryCode);
    }
    const bundleError = diagnoseSyntax(code);
    if (bundleError) {
      const hookLine = bundleError.line - (libraryCode.split('\n').length - 1);
      return hookLine > 0
        ? rejected(hookName, hookLine, bundleError.message, detailsFor(bundleError), bundleError.column, hookCode)
        : rejected(libraryName, bundleError.line, bundleError.message, detailsFor(bundleError), bundleError.column, libraryCode);
    }
  }

  const workerCode = `
    self.onmessage = function(e) {
      const { code, hookCode, worldState, input, isModifierScript, hookName, history: turnHistory, libraryName = 'Library', infoExtra = {} } = e.data;
      // Tell the host the script is about to run, so its watchdog can time the
      // script rather than the worker's startup (see the timeout below).
      self.postMessage({ status: 'started' });
      const logs = [];
      // Errors the script caught itself and reported with console.error.
      const caught = [];

      // ── Mapping engine stack frames back onto the user's scripts ─────────
      // The wrapped function is: 1 header line, then the Library (lines
      // 2 … libraryEndAbs), then the hook (after hookLineOffset). Every frame
      // in that function is tagged userscript.js by the sourceURL comment, so
      // a frame's line says which script — and which line of it — ran.
      const NL = String.fromCharCode(10);
      var libraryPart = '', libraryEndAbs = 1, originalHook = '';
      const _locate = (abs, col) => {
        if (abs > hookLineOffset) {
          const rel = abs - hookLineOffset;
          return { script: hookName, line: rel, column: col, sourceLine: (originalHook.split(NL)[rel - 1] || '') };
        }
        if (abs >= 2 && abs <= libraryEndAbs) {
          const rel = abs - 1;
          return { script: libraryName, line: rel, column: col, sourceLine: (libraryPart.split(NL)[rel - 1] || '') };
        }
        return null;
      };
      // Innermost first, as the engine lists them. Frames outside the user's
      // code (the Story Card API, the worker itself) are skipped.
      const _frames = (stack) => {
        const out = [];
        const re = /userscript\\.js:(\\d+):(\\d+)/g;
        let m;
        while ((m = re.exec(String(stack || ''))) !== null) {
          const loc = _locate(Number(m[1]), Number(m[2]));
          if (loc) out.push(loc);
        }
        return out;
      };
      const _fmt = (a) => (a instanceof Error) ? (a.name + ': ' + a.message)
        : (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a));
      
      // No pre-execution state dump: AID's log shows only what the script itself
      // logs, and the before/after world state is already captured structurally
      // (scriptingService snapshots it either side of the run and the State Editor
      // renders the delta), so dumping it here only buried the script's own output.

      // ── Runtime evidence for "why is it undefined?" ──────────────────────
      // A copy of the real globals at the moment something came out undefined,
      // so the host can check each step of e.g. state.player.inventory. The
      // globals are created inside the try block below; these refs point at them.
      var _g = { state: null, info: null, storyCards: null, history: null };
      const SNAPSHOT_LIMIT = 2000000; // characters of JSON; a bigger state is skipped
      const _snapshot = () => {
        try {
          const stateJson = JSON.stringify(_g.state);
          return {
            state: stateJson && stateJson.length <= SNAPSHOT_LIMIT ? JSON.parse(stateJson) : undefined,
            info: _g.info ? JSON.parse(JSON.stringify(_g.info)) : undefined,
            storyCards: Array.isArray(_g.storyCards)
              ? _g.storyCards.map(c => ({ title: c && c.title, keys: c && c.keys, type: c && c.type }))
              : undefined,
            historyLength: Array.isArray(_g.history) ? _g.history.length : undefined,
          };
        } catch (e) {
          return undefined;
        }
      };
      const _isUndefinedKind = (message) => /undefined|null|not a function|not iterable/.test(String(message || ''));
      // log() calls that printed undefined: where, which arguments, and a snapshot.
      const undefinedLogs = [];
      const _locateUndefined = (args) => {
        const which = [];
        args.forEach((a, i) => { if (a === undefined) which.push(i); });
        if (!which.length) return '';
        try {
          const at = _frames(new Error().stack)[0];
          if (!at) return '';
          if (undefinedLogs.length < 5) {
            undefinedLogs.push({ script: at.script, line: at.line, column: at.column, sourceLine: at.sourceLine.trim(), args: which, snapshot: _snapshot() });
          }
          return '  [undefined at ' + at.script + ' line ' + at.line + ': ' + at.sourceLine.trim().substring(0, 120) + ']';
        } catch (e) {
          return '';
        }
      };
      const console = {
        log: (...args) => {
          const formatted = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a));
          logs.push(formatted.join(' ') + _locateUndefined(args));
        },
        error: (...args) => {
          // Error objects stringify to "{}", which is how a caught crash used to
          // show up as "ERROR: {}". Format them as "Name: message" instead.
          const formatted = args.map(_fmt);
          logs.push(['ERROR:', ...formatted].join(' ') + _locateUndefined(args));
          // Where it went wrong: an Error argument's own stack points at the
          // throw; otherwise the line that called console.error.
          const errArg = args.find(a => a instanceof Error);
          const frames = _frames((errArg && errArg.stack) || new Error().stack);
          const at = frames[0] || null;
          const caughtMessage = errArg ? (errArg.name + ': ' + errArg.message) : formatted.join(' ');
          caught.push({
            message: caughtMessage,
            script: at ? at.script : hookName,
            line: at ? at.line : null,
            column: at ? at.column : null,
            sourceLine: at ? at.sourceLine.trim() : '',
            snapshot: _isUndefinedKind(caughtMessage) ? _snapshot() : undefined,
          });
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
        // characterNames is the documented field (help.aidungeon.com/scripting);
        // characters is kept for scripts written against the older name.
        const info = Object.assign(
          { actionCount: (history.length || 0), characterNames: [], characters: [], maxChars: 8192 },
          worldState.info || {},
          infoExtra || {}
        );
        const storyCards = Array.isArray(worldState.storyCards) ? worldState.storyCards : (worldState.storyCards = []);
        _g = { state, info, storyCards, history };
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

        libraryPart = hookCode ? code.slice(0, -hookCode.length) : '';
        // Line 1 is the wrapper header, so the Library spans lines 2 … 1 + its line count.
        libraryEndAbs = 1 + (libraryPart ? libraryPart.split(NL).length - 1 : 0);
        originalHook = hookCode || code;
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
        
        self.postMessage({ status: 'success', newState: worldState, logs, result, caught, undefinedLogs });
      } catch (err) {
        const message = (err && err.message) || String(err);
        // The innermost frame in the user's code is where it actually broke —
        // inside a Library function when that is where the bad line is. The
        // hook line that led there is kept as calledFrom, so the editor can
        // show both "the failing line" and "how we got there".
        const frames = err && err.stack ? _frames(err.stack) : [];
        const at = frames[0] || null;
        const hookFrame = frames.find(f => f.script === hookName) || null;
        const calledFrom = at && at.script !== hookName && hookFrame
          ? { script: hookFrame.script, line: hookFrame.line, column: hookFrame.column, sourceLine: hookFrame.sourceLine.trim() }
          : undefined;
        const where = at ? at.script + ', line ' + at.line : hookName;
        logs.push('[ERROR] ' + where + ': ' + message);
        self.postMessage({
          status: 'error', logs, result: null, caught, undefinedLogs,
          error: {
            hook: hookName,
            script: at ? at.script : hookName,
            line: at ? String(at.line) : 'unknown',
            column: at ? at.column : undefined,
            sourceLine: at ? at.sourceLine.trim() : undefined,
            calledFrom,
            message,
            kind: 'runtime',
            snapshot: _isUndefinedKind(message) ? _snapshot() : undefined,
            details: at ? at.line + ' | ' + at.sourceLine.trim() : undefined,
          },
        });
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
        caught: [],
        error: { hook: hookName, script: hookName, line: 'unknown', message, kind: /timed out/.test(message) ? 'timeout' : 'runtime' },
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
      const { status, newState, logs, result, error, caught, undefinedLogs } = e.data;
      let located: ExecutionError | null = status === 'error'
        ? (error ?? { hook: hookName, script: hookName, line: 'unknown', message: 'Execution error', kind: 'runtime' })
        : null;
      // A redeclaration is thrown by eval itself, before any frame exists, so
      // it arrives without a line. Find the clashing declaration ourselves.
      if (located && located.line === 'unknown') {
        located = locateRedeclaration(located, code, hookCode, libraryName) ?? located;
      }
      resolve({
        newState: status === 'success' ? newState : worldState,
        logs: logs || [],
        result,
        error: located,
        caught: Array.isArray(caught) ? caught : [],
        undefinedLogs: Array.isArray(undefinedLogs) ? undefinedLogs : [],
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
        caught: [],
        error: { hook: hookName, script: hookName, line: 'unknown', message: e.message, kind: 'runtime' },
      });
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    // Hand scripts AID's exact `{ text, type, rawText }` — `turn` is an Atlas-only
    // annotation for the State Editor and must not appear on the `history` global.
    const aidHistory = history.map(({ text, type, rawText }) => ({ text, type, rawText }));
    worker.postMessage({ code, hookCode, worldState: JSON.parse(JSON.stringify(worldState)), input, isModifierScript, hookName, history: aidHistory, libraryName, infoExtra });
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

type AstNode = { type: string; start: number; end: number; loc?: { start: { line: number; column: number } }; [k: string]: unknown };

/** Depth-first walk over every node (with its parent) in an acorn AST. */
function walkAst(node: unknown, visit: (n: AstNode, parent: AstNode | null) => void, parent: AstNode | null = null): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walkAst(child, visit, parent);
    return;
  }
  const n = node as AstNode;
  if (typeof n.type !== 'string') return;
  visit(n, parent);
  for (const key in n) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'type') continue;
    walkAst(n[key], visit, n);
  }
}

/** Every name a script binds: declarations, functions, classes, parameters, catch params. */
function boundNames(ast: AstNode): Set<string> {
  const names = new Set<string>();
  const addPattern = (p: unknown) => {
    if (!p || typeof p !== 'object') return;
    const n = p as AstNode;
    if (n.type === 'Identifier') names.add(n.name as string);
    else if (n.type === 'ObjectPattern') (n.properties as AstNode[]).forEach(pr => addPattern(pr.type === 'RestElement' ? pr.argument : pr.value));
    else if (n.type === 'ArrayPattern') (n.elements as AstNode[]).forEach(addPattern);
    else if (n.type === 'AssignmentPattern') addPattern(n.left);
    else if (n.type === 'RestElement') addPattern(n.argument);
  };
  walkAst(ast, n => {
    if (n.type === 'VariableDeclarator') addPattern(n.id);
    else if (n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') {
      if (n.id) addPattern(n.id);
      (n.params as AstNode[]).forEach(addPattern);
    } else if (n.type === 'ClassDeclaration' && n.id) addPattern(n.id);
    else if (n.type === 'CatchClause' && n.param) addPattern(n.param);
  });
  return names;
}

/**
 * Check a script. Errors come from the parser (the code can't run); warnings
 * from walking the parsed syntax tree, so text inside strings and comments can
 * never trigger them and every position is exact.
 *
 * `knownNames` are names defined elsewhere (the Library, for a hook) so the
 * typo check doesn't flag them.
 */
export const validateScriptSyntax = (
  code: string, isModifierScript = false, _hookCode?: string, knownNames: Iterable<string> = [],
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const lines = code.split('\n');

  // NOTE: Library-to-hook redeclaration detection was removed. Top-level
  // `const`/`let` collisions between a script and the bundled Library are not
  // a runtime error in AID — each script is evaluated in its own scope, and
  // mock/test scripts frequently shadow Library names without ill effect.
  // The JS engine (or the runtime error path) is the source of truth for
  // actual redeclaration failures, so we no longer pre-emptively flag them.

  const syntaxError = diagnoseSyntax(code);
  if (syntaxError) errors.push(syntaxError);

  // Offsets → 1-based line/column.
  const lineStarts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStarts.push(i + 1);
  const at = (offset: number) => {
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, column: offset - lineStarts[lo] + 1 };
  };
  const warn = (type: string, message: string, offset: number) => {
    const { line, column } = at(offset);
    warnings.push({
      type, message, line, column, severity: 'warning',
      codeSnippet: lines[line - 1] ?? '',
      context: getContextWithCaret(code, line, column),
    });
  };

  let ast: AstNode | null = null;
  if (!syntaxError) {
    try {
      ast = acornParse(code, ACORN_OPTIONS) as unknown as AstNode;
    } catch {
      ast = null;
    }
  }

  if (ast) {
    const declared = boundNames(ast);
    for (const k of knownNames) declared.add(k);
    const builtins = new Set(['this', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'console', 'window', 'globalThis', 'Promise', 'Map', 'Set']);

    walkAst(ast, (n) => {
      // Assignment used as a condition: `if (hp = 0)` always runs the branch
      // and overwrites hp. Double parentheses `if ((m = re.exec(s)))` are the
      // conventional way to say it's intended, so those are left alone.
      if ((n.type === 'IfStatement' || n.type === 'WhileStatement' || n.type === 'DoWhileStatement' || n.type === 'ForStatement')) {
        const test = n.test as AstNode | null;
        if (test && test.type === 'AssignmentExpression' && test.operator === '=' && code.slice(test.start - 2, test.start) !== '((') {
          const eq = code.indexOf('=', (test.left as AstNode).end);
          warn('ASSIGNMENT_IN_CONDITION', 'This sets a value (=) instead of comparing (===), so the condition is always the new value. Use === to compare.', eq >= 0 ? eq : test.start);
        }
      }
      // Loose equality: `"1" == 1` is true. `x == null` (null or undefined) is a common, deliberate idiom.
      if (n.type === 'BinaryExpression' && (n.operator === '==' || n.operator === '!=')) {
        const l = n.left as AstNode, r = n.right as AstNode;
        const isNull = (x: AstNode) => x.type === 'Literal' && x.value === null;
        if (!isNull(l) && !isNull(r)) {
          const op = code.indexOf(n.operator as string, l.end);
          warn('LOOSE_EQUALITY', `${n.operator} converts types before comparing ("1" == 1 is true). Use ${n.operator}= to compare exactly.`, op >= 0 ? op : n.start);
        }
      }
      // for…in walks the *keys* of an object as strings — on an array that's
      // "0", "1", …, not the items.
      if (n.type === 'ForInStatement') {
        warn('LOOP_PATTERN', 'for…in loops over keys (as strings). To loop over the items of a list, use for…of.', n.start);
      }
      // A near-miss of an AID global used as an object: `stat.hp`, `Text.includes`.
      if (n.type === 'MemberExpression') {
        const obj = n.object as AstNode;
        if (obj.type === 'Identifier') {
          const ident = obj.name as string;
          if (!declared.has(ident) && !builtins.has(ident) && !AID_GLOBALS.includes(ident)) {
            const near = AID_GLOBALS.find(g => isEditDistanceOne(g, ident));
            if (near) warn('UNDOCUMENTED_API', `"${ident}" is not defined anywhere — did you mean "${near}"?`, obj.start);
          }
        }
      }
    });

    // Modifier scripts should hand text back: `return { text }` (or a string).
    if (isModifierScript) {
      let returns = false;
      // An arrow with an expression body — `(text) => ({ text })` — returns implicitly.
      walkAst(ast, n => {
        if (n.type === 'ReturnStatement' || (n.type === 'ArrowFunctionExpression' && n.expression === true)) returns = true;
      });
      if (!returns) {
        warnings.push({
          type: 'MISSING_RETURN',
          message: 'This hook never returns anything. AID expects the modifier to end with "return { text };" — without it, the text passes through unchanged.',
          line: lines.length, column: 1, severity: 'warning',
          codeSnippet: lines[lines.length - 1] || '', context: '',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.sort((a, b) => a.line - b.line),
    warnings: warnings.sort((a, b) => a.line - b.line || a.column - b.column),
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
