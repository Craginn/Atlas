import { WorldState } from '../types';

export const runOfflineSimulation = async (
  code: string,
  worldState: WorldState,
  input: string,
  isModifierScript: boolean
): Promise<{ newState: WorldState; logs: any[]; result: { text: string } | null }> => {
  // Validate syntax before execution
  const validation = validateScriptSyntax(code);
  if (!validation.valid && validation.errors.length > 0) {
    const errorMessage = formatValidationResults(validation);
    return {
      newState: worldState,
      logs: [errorMessage],
      result: null
    };
  }

  const workerCode = `
    self.onmessage = function(e) {
      const { code, worldState, input, isModifierScript } = e.data;
      const logs = [];
      
      // Log initial state and code info
      logs.push('[DEBUG] Code length: ' + code.length + ' chars, isModifierScript: ' + isModifierScript);
      logs.push('[DEBUG] WorldState before execution: ' + JSON.stringify(worldState));
      
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
        const history = worldState.history || [];
        
        // Context utility functions (from AI Dungeon pattern)
        function extractSections(text, headings) {
            let result = [];
            let cursor = 0;
            for (let i = 0; i < headings.length; i++) {
                let start = text.indexOf(headings[i], cursor);
                if (start === -1) {
                    result.push('');
                    continue;
                }
                start += headings[i].length;
                let end = -1;
                for (let j = i + 1; j < headings.length && end === -1; j++) {
                    end = text.indexOf(headings[j], start);
                }
                if (end === -1) {
                    end = text.length;
                }
                result.push(text.slice(start, end));
                cursor = end;
            }
            return result;
        }
        
        function splatContext(text) {
            const ctxHeadings = [
                '',
                'World Lore:\\n',
                'Story Summary:\\n',
                'Memories:\\n',
                'Recent Story:\\n',
                '[Author\'s note: ',
                ']\\n'
            ];
            let result = extractSections(text, ctxHeadings);
            return {
                PE: result[0],
                SC: result[1],
                SS: result[2],
                MM: result[3],
                RS: result[4],
                AN: result[5],
                LA: result[6],
                length: text.length
            };
        }
        
        function unsplatContext(ctx) {
            const ctxHeadings = [
                '',
                'World Lore:\\n',
                'Story Summary:\\n',
                'Memories:\\n',
                'Recent Story:\\n',
                '[Author\'s note: ',
                ']\\n'
            ];
            return ctxHeadings[0] + ctx.PE +
                ctxHeadings[1] + ctx.SC +
                ctxHeadings[2] + ctx.SS +
                ctxHeadings[3] + ctx.MM +
                ctxHeadings[4] + ctx.RS +
                ctxHeadings[5] + ctx.AN +
                ctxHeadings[6] + ctx.LA;
        }
        
        let execCode = code;
        if (isModifierScript) {
            execCode = code.replace(/modifier\s*\(\s*text\s*\)\s*;?\s*$/, 'return modifier(text);');
        }

        const wrappedCode = '(function(worldState, input, text, state, console, history, extractSections, splatContext, unsplatContext) {\\n' + execCode + '\\n})\\n//# sourceURL=userscript.js\\n';
        const fn = eval(wrappedCode);
        const result = fn(worldState, input, text, state, console, history, extractSections, splatContext, unsplatContext);
        
        logs.push('[DEBUG] WorldState after execution: ' + JSON.stringify(worldState));
        logs.push('[DEBUG] Modified Text: ' + (result?.text ? '"' + result.text + '"' : 'None'));
        
        self.postMessage({ status: 'success', newState: worldState, logs, result });
      } catch (err) {
        let lineNumber = 'unknown';
        let message = err.message || String(err);
        let stack = '';
        if (err.stack) {
          const stackLines = err.stack.split('\\n');
          for (const sl of stackLines) {
            const m = sl.match(/userscript\\.js:(\\d+)/);
            if (m) {
              lineNumber = String(Math.max(1, Number(m[1]) - 1));
              break;
            }
          }
          if (lineNumber === 'unknown') {
            for (const sl of stackLines) {
              const m = sl.match(/Function:(\\d+)/) || sl.match(/<anonymous>:(\\d+)/);
              if (m) {
                lineNumber = String(Math.max(1, Number(m[1]) - 2));
                break;
              }
            }
          }
          stack = err.stack;
        }
        logs.push('[DEBUG] EXECUTION ERROR at line ' + lineNumber + ': ' + message);
        logs.push('[DEBUG] Stack: ' + stack);
        logs.push('Error at line ' + lineNumber + ': ' + message);
        logs.push('[DEBUG] WorldState at error: ' + JSON.stringify(worldState));
        self.postMessage({ status: 'error', logs, result: null });
      }
    };
  `;

  return new Promise((resolve) => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({ newState: worldState, logs: ['Execution timed out after 1000ms.'], result: null });
      URL.revokeObjectURL(url);
    }, 1000);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      const { status, newState, logs, result } = e.data;
      resolve({ newState: status === 'success' ? newState : worldState, logs: logs || [], result });
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    worker.onerror = (e) => {
      clearTimeout(timeout);
      resolve({ newState: worldState, logs: [`Worker Error: ${e.message}`], result: null });
      worker.terminate();
      URL.revokeObjectURL(url);
    };

    worker.postMessage({ code, worldState: JSON.parse(JSON.stringify(worldState)), input, isModifierScript });
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

function isRegexLiteralStart(code: string, position: number): boolean {
  let cursor = position - 1;

  while (cursor >= 0 && /\s/.test(code[cursor])) {
    cursor--;
  }

  if (cursor < 0) {
    return true;
  }

  const previousChar = code[cursor];
  if ('=([{,:;!?&|+-*%~<>'.includes(previousChar)) {
    return true;
  }

  const previousWordMatch = code.substring(0, cursor + 1).match(/([A-Za-z_$][\w$]*)$/);
  const previousWord = previousWordMatch?.[1];

  return previousWord !== undefined && [
    'case',
    'delete',
    'in',
    'instanceof',
    'new',
    'of',
    'return',
    'throw',
    'typeof',
    'void',
  ].includes(previousWord);
}

function getParserSyntaxError(code: string): ValidationError | null {
  try {
    new Function(code);
    return null;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown syntax error';
    const stack = error instanceof Error ? error.stack ?? '' : '';
    const locationMatch =
      stack.match(/<anonymous>:(\d+):(\d+)/) ??
      stack.match(/Function:(\d+):(\d+)/) ??
      message.match(/line (\d+)/i);

    const line = locationMatch ? parseInt(locationMatch[1], 10) : 1;
    const column = locationMatch && locationMatch[2] ? parseInt(locationMatch[2], 10) : 1;

    return {
      type: 'SYNTAX_ERROR',
      message,
      line,
      column,
      severity: 'error',
      codeSnippet: getLineOfCode(code, line),
      context: getContextWithCaret(code, line, column)
    };
  }
}

export const validateScriptSyntax = (code: string): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const lines = code.split('\n');

  // ============ 1. BRACKET/BRACE/PAREN MATCHING WITH LINE TRACKING ============
  const checkBracketBalance = () => {
    const stack: Array<{ type: string; line: number; column: number; pos: number }> = [];
    let inString = false;
    let stringChar = '';
    let inRegex = false;
    let inLineComment = false;
    let inBlockComment = false;
    let inRegexCharClass = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';

      if (inLineComment) {
        if (char === '\n') {
          inLineComment = false;
        }
        continue;
      }

      if (inBlockComment) {
        if (prevChar === '*' && char === '/') {
          inBlockComment = false;
        }
        continue;
      }

      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (!inRegex && char === '/' && code[i + 1] === '/') {
          inLineComment = true;
          i++;
          continue;
        }

        if (!inRegex && char === '/' && code[i + 1] === '*') {
          inBlockComment = true;
          i++;
          continue;
        }

        if (char === '/' && !inRegex) {
          if (isRegexLiteralStart(code, i)) {
            inRegex = true;
            inRegexCharClass = false;
            continue;
          }
        } else if (inRegex) {
          if (char === '[' && prevChar !== '\\') {
            inRegexCharClass = true;
            continue;
          }

          if (char === ']' && prevChar !== '\\') {
            inRegexCharClass = false;
            continue;
          }

          if (char !== '/' || prevChar === '\\' || inRegexCharClass) {
            continue;
          }

          inRegex = false;

          let j = i + 1;
          while (j < code.length && /[dgimsuvy]/.test(code[j])) {
            j++;
          }
          i = j - 1;
          continue;
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
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';

      if (inLineComment) {
        if (char === '\n') {
          inLineComment = false;
        }
        continue;
      }

      if (inBlockComment) {
        if (prevChar === '*' && char === '/') {
          inBlockComment = false;
        }
        continue;
      }

      if (!inString && char === '/' && code[i + 1] === '/') {
        inLineComment = true;
        i++;
        continue;
      }

      if (!inString && char === '/' && code[i + 1] === '*') {
        inBlockComment = true;
        i++;
        continue;
      }

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

  // ============ 3. COMMON TYPOS & PATTERNS ============
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

      // Case sensitivity issues
      if (line.includes('state.ps') || line.includes('state.Ps')) {
        const column = line.indexOf('state.p');
        errors.push({
          type: 'CASE_SENSITIVITY',
          message: `"state.ps" should be "state.PS"`,
          line: lineNum,
          column,
          severity: 'error',
          codeSnippet: line,
          context: getContextWithCaret(code, lineNum, column)
        });
      }

      // Typo: healt instead of health
      if (line.includes('.Healt') || line.includes('.healt')) {
        const column = line.indexOf('healt');
        errors.push({
          type: 'TYPO',
          message: `"healt" should be "health"`,
          line: lineNum,
          column,
          severity: 'error',
          codeSnippet: line,
          context: getContextWithCaret(code, lineNum, column)
        });
      }

      // Typo: activeMonster instead of activeMonsters
      if (line.includes('.activeMonster') && !line.includes('.activeMonsters')) {
        const column = line.indexOf('activeMonster');
        errors.push({
          type: 'TYPO',
          message: `"activeMonster" should be "activeMonsters" (plural)`,
          line: lineNum,
          column,
          severity: 'error',
          codeSnippet: line,
          context: getContextWithCaret(code, lineNum, column)
        });
      }

      // Unsafe state.PS access
      if (line.includes('state.PS.') && !line.includes('state.PS !== undefined')) {
        const prevLines = lines.slice(Math.max(0, idx - 3), idx).join('\n');
        if (!prevLines.includes('state.PS !== undefined') && !prevLines.includes('if (state.PS)')) {
          const column = line.indexOf('state.PS');
          warnings.push({
            type: 'UNSAFE_STATE_ACCESS',
            message: `Accessing state.PS without null check`,
            line: lineNum,
            column,
            severity: 'warning',
            codeSnippet: line,
            context: getContextWithCaret(code, lineNum, column)
          });
        }
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

  const parserSyntaxError = getParserSyntaxError(code);

  if (parserSyntaxError) {
    checkStrings();
    checkBracketBalance();

    if (errors.length === 0) {
      errors.push(parserSyntaxError);
    }
  } else {
    checkCommonErrors();
  }

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
