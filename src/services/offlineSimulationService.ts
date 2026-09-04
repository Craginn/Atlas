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
  // The AID hook this code runs as ("Input Modifier", "Output Modifier", …).
  // Surfaced in the [ERROR] log line so failures name their hook.
  hookName = 'Unknown Hook',
  // AID's `history` global. Passed separately rather than read off worldState:
  // in AID it is engine-owned and NOT part of `state`, so folding it into the
  // state object made every turn's text accumulate in the thing scripts persist.
  // Read-only here — AID gives scripts no way to write it, so nothing comes back.
  history: HistoryEntry[] = [],
  // Lines the caller prepended to `code` ahead of the hook's own script (the
  // Library, a preamble). Error lines are mapped back past this offset so they
  // match the script the editor shows.
  lineOffset = 0,
): Promise<{
  newState: WorldState;
  logs: unknown[];
  // AID accepts either `{ text }` or a bare string from a modifier, so the raw
  // return is passed through as-is; callers normalize via normalizeModifierResult.
  result: { text?: string; stop?: boolean } | string | null;
  // Present only when execution threw. The caller uses this to halt the
  // pipeline (the engine stops) and paint the error surface red.
  error?: { hook: string; line: string; message: string } | null;
}> => {
  // Validate syntax before execution
  const validation = validateScriptSyntax(code, isModifierScript);
  if (!validation.valid && validation.errors.length > 0) {
    const errorMessage = formatValidationResults(validation);
    const first = validation.errors[0];
    return {
      newState: worldState,
      logs: [errorMessage],
      result: null,
      error: { hook: hookName, line: String(first?.line ?? 'unknown'), message: first?.message ?? 'Validation failed' },
    };
  }

  const workerCode = `
    self.onmessage = function(e) {
      const { code, worldState, input, isModifierScript, hookName, history: turnHistory, lineOffset = 0 } = e.data;
      // Tell the host the script is about to run, so its watchdog can time the
      // script rather than the worker's startup (see the timeout below).
      self.postMessage({ status: 'started' });
      const logs = [];
      
      // No pre-execution state dump: AID's log shows only what the script itself
      // logs, and the before/after world state is already captured structurally
      // (scriptingService snapshots it either side of the run and the State Editor
      // renders the delta), so dumping it here only buried the script's own output.

      const console = {
        log: (...args) => {
          const formatted = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a));
          logs.push(formatted.join(' '));
        },
        error: (...args) => {
          const formatted = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a));
          logs.push(['ERROR:', ...formatted].join(' '));
        }
      };
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

        let execCode = code;
        if (isModifierScript) {
            execCode = code.replace(/modifier\\s*\\(\\s*text\\s*\\)\\s*;?\\s*$/, 'return modifier(text);');
        }

        const wrappedCode = '(function(worldState, input, text, state, console, history, info, storyCards, memory, stop, log, addStoryCard, updateStoryCard, removeStoryCard, addWorldEntry, updateWorldEntry, removeWorldEntry) {\\n' + execCode + '\\n})\\n//# sourceURL=userscript.js\\n';
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
        // Curate the failure for the script that threw, not the eval that wrapped
        // it. Only the sourceURL-tagged userscript frame is trusted: the wrapper
        // adds exactly one line and the Library preamble adds lineOffset more,
        // so the reported line matches the hook's own source as the editor shows
        // it. The failing line is quoted; the raw stack and the world state stay
        // out — a bare hook, line, and message a user (or an LLM reading the
        // log) can act on without noise.
        const message = err.message || String(err);
        let lineNumber = 'unknown';
        let sourceLine = '';
        if (err.stack) {
          const m = err.stack.match(/userscript\\.js:(\\d+)/);
          if (m) {
            const rawLine = Math.max(1, Number(m[1]) - 1);           // line within the executed code
            lineNumber = String(Math.max(1, rawLine - lineOffset));  // line within the hook's own script
            sourceLine = (code.split('\\n')[rawLine - 1] || '').trim();
          }
        }
        logs.push('[ERROR] ' + hookName + (lineNumber !== 'unknown' ? ', line ' + lineNumber : '') + ': ' + message);
        if (sourceLine) {
          logs.push('[ERROR] ' + lineNumber + ' | ' + sourceLine);
        }
        self.postMessage({ status: 'error', logs, result: null, error: { hook: hookName, line: lineNumber, message: message } });
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
    worker.postMessage({ code, worldState: JSON.parse(JSON.stringify(worldState)), input, isModifierScript, hookName, history: aidHistory, lineOffset });
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

// Helper function to get line and column from absolute position
function getLineColumn(code: string, position: number): { line: number; column: number } {
  const lines = code.substring(0, position).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
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

export const validateScriptSyntax = (code: string, isModifierScript = false): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const lines = code.split('\n');

  // ============ 1. BRACKET/BRACE/PAREN MATCHING WITH LINE TRACKING ============
  const checkBracketBalance = () => {
    const stack: Array<{ type: string; line: number; column: number; pos: number }> = [];
    let inString = false;
    let stringChar = '';
    let inRegex = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';

      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        // Detect regex literals: /pattern/flags
        // Regex appears after: =, (, [, {, ,, :, !, &, |, ?, +, -, *, /, %, return, etc.
        if (char === '/' && !inRegex) {
          const regexStart = /[=([{,:!&|?+\-*/%\s]\s*$/.test(code.substring(0, i));
          if (regexStart) inRegex = true;
        } else if (char === '/' && inRegex && prevChar !== '\\') {
          inRegex = false;
          // Skip past flags (gimsuvy)
          let j = i + 1;
          while (j < code.length && /[gimsuvy]/.test(code[j])) j++;
          i = j - 1;
        }

        if (!inRegex) {
          if (char === '{' || char === '[' || char === '(') {
            const { line, column } = getLineColumn(code, i);
            stack.push({ type: char, line, column, pos: i });
          } else if (char === '}' || char === ']' || char === ')') {
            const expected = char === '}' ? '{' : char === ']' ? '[' : '(';
            const { line, column } = getLineColumn(code, i);
            
            if (stack.length === 0 || stack[stack.length - 1].type !== expected) {
              errors.push({
                type: 'BRACKET_MISMATCH',
                message: `Unexpected closing ${char} - no matching opening ${expected}`,
                line,
                column,
                severity: 'error',
                codeSnippet: getLineOfCode(code, line),
                context: getContextWithCaret(code, line, column)
              });
            } else {
              stack.pop();
            }
          }
        }
      }
    }

    for (const bracket of stack) {
      const closing = bracket.type === '{' ? '}' : bracket.type === '[' ? ']' : ')';
      errors.push({
        type: 'UNCLOSED_BRACKET',
        message: `Unclosed ${bracket.type} - missing closing ${closing}`,
        line: bracket.line,
        column: bracket.column,
        severity: 'error',
        codeSnippet: getLineOfCode(code, bracket.line),
        context: getContextWithCaret(code, bracket.line, bracket.column)
      });
    }
  };

  // ============ 2. UNCLOSED STRINGS/TEMPLATE LITERALS ============
  const checkStrings = () => {
    let inString = false;
    let stringChar = '';
    let stringStart = 0;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';

      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
          stringStart = i;
        } else if (char === stringChar) {
          inString = false;
        }
      }
    }

    if (inString) {
      const { line, column } = getLineColumn(code, stringStart);
      errors.push({
        type: 'UNCLOSED_STRING',
        message: `Unclosed string starting with ${stringChar}`,
        line,
        column,
        severity: 'error',
        codeSnippet: getLineOfCode(code, line),
        context: getContextWithCaret(code, line, column)
      });
    }
  };

  // ============ 3. MISSING COMMAS IN ARRAYS/OBJECTS ============
  const checkMissingCommas = () => {
    let inString = false;
    let stringChar = '';
    let lastStringEnd = -1;
    let consecutiveStrings = 0;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';

      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
          
          // Check if this string immediately follows another (after whitespace)
          const textBetween = code.substring(lastStringEnd, i).trim();
          if (lastStringEnd !== -1 && textBetween === '' && consecutiveStrings > 0) {
            const { line, column } = getLineColumn(code, i);
            warnings.push({
              type: 'MISSING_COMMA',
              message: `Possible missing comma between array/object elements`,
              line,
              column,
              severity: 'warning',
              codeSnippet: getLineOfCode(code, line),
              context: getContextWithCaret(code, line, column)
            });
          }
          consecutiveStrings++;
        } else if (char === stringChar) {
          inString = false;
          lastStringEnd = i + 1;
        }
      } else if (!inString && char !== ' ' && char !== '\n' && char !== '\t' && char !== ',') {
        consecutiveStrings = 0;
      }
    }
  };

  // ============ 4. FUNCTION SYNTAX VALIDATION ============
  const checkFunctionSyntax = () => {
    try {
      new Function(code);
    } catch (err: any) {
      const message = err.message;
      let lineNum = 1;
      const lineMatch = message.match(/line (\d+)/);
      if (lineMatch) {
        lineNum = parseInt(lineMatch[1]);
      }
      
      errors.push({
        type: 'SYNTAX_ERROR',
        message: `${message}`,
        line: lineNum,
        column: 1,
        severity: 'error',
        codeSnippet: getLineOfCode(code, lineNum),
        context: getContextWithCaret(code, lineNum, 1)
      });
    }
  };

  // ============ 5. COMMON TYPOS & PATTERNS ============
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

  // ============ 6. AID SCRIPTING API VALIDATION ============
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

  // Determine whether the code is syntactically valid JS up front. If it parses,
  // its brackets/strings ARE balanced — so we skip the heuristic bracket/string/
  // comma scanners, which mis-handle regex literals like /foo\/bar/g and produce
  // false "unclosed bracket/string" errors. When it doesn't parse, we run those
  // scanners to give better line-level diagnostics than the raw parser message.
  let parses = true;
  try {
    new Function(code);
  } catch {
    parses = false;
  }

  if (parses) {
    checkFunctionSyntax(); // no-op on valid code, but harmless and future-proof
  } else {
    checkBracketBalance();
    checkStrings();
    checkMissingCommas();
    checkFunctionSyntax();
  }

  // Semantic checks run regardless — they don't depend on regex tokenization.
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
