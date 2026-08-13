// Splitting a terminal line into a command and its arguments.
//
// Shell-style quoting, because the most common argument in this app is a
// sentence: `/run "you draw a sword"` has to arrive as one argument, not four.

export interface ParsedLine {
  /** Command name without the leading slash, lowercased. Empty for shell input. */
  name: string;
  args: string[];
  /** True when the line is not an Atlas command and should go to the shell. */
  isShell: boolean;
}

/**
 * Split on whitespace, respecting single and double quotes.
 *
 * A trailing unclosed quote yields the rest of the line as one argument rather
 * than an error — someone still typing shouldn't be told off mid-word, and the
 * alternative (rejecting the line) loses what they wrote.
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else if (ch === '\\' && input[i + 1] === quote) {
        // Escaped quote inside a quoted run: take it literally.
        current += quote;
        i++;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      // An empty quoted string ("") is still an argument, so remember that a
      // token began even if no characters land in it.
      started = true;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current || started) {
        tokens.push(current);
        current = '';
        started = false;
      }
      continue;
    }

    current += ch;
  }

  if (current || started || quote) tokens.push(current);
  return tokens;
}

/**
 * Classify a line.
 *
 * A leading `/` means an Atlas command; everything else goes to the shell
 * verbatim. The slash prefix exists so Atlas's own verbs can never shadow a
 * real binary — `/state` is Atlas, `state` is whatever is on your PATH.
 *
 * Shell input is deliberately not tokenized here. Quoting, pipes, globs and
 * redirection are the shell's job, and re-splitting the line would break
 * exactly the case this terminal exists for: `curl … | bash`.
 */
export function parseLine(input: string): ParsedLine {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return { name: '', args: [], isShell: trimmed.length > 0 };
  }

  // A path is not a command: `/usr/bin/env node` should run, not be read as an
  // Atlas verb called "usr". Anything with a slash in the first token is shell.
  const firstToken = trimmed.slice(1).split(/\s/)[0];
  if (firstToken.includes('/')) {
    return { name: '', args: [], isShell: true };
  }

  const tokens = tokenize(trimmed.slice(1));
  if (tokens.length === 0 || !tokens[0]) {
    // A bare "/" is a typo. Running it as a shell command would just error.
    return { name: '', args: [], isShell: false };
  }
  return { name: tokens[0].toLowerCase(), args: tokens.slice(1), isShell: false };
}

/** Pull `--flag` / `--key=value` out of an argument list. */
export function extractFlags(args: string[]): {
  positional: string[];
  flags: Record<string, string | true>;
} {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (const arg of args) {
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const body = arg.slice(2);
    const eq = body.indexOf('=');
    if (eq === -1) flags[body] = true;
    else flags[body.slice(0, eq)] = body.slice(eq + 1);
  }
  return { positional, flags };
}
