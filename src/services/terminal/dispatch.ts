import { ALL_COMMANDS } from './commands';
import { parseLine } from './parse';
import { Command, CommandContext, CommandResult, OutputLine, err, info } from './types';

// Routing one typed line to either an Atlas command or the shell.

const byName = new Map<string, Command>();
for (const cmd of ALL_COMMANDS) {
  byName.set(cmd.name, cmd);
  for (const alias of cmd.aliases ?? []) byName.set(alias, cmd);
}

export function findCommand(name: string): Command | undefined {
  return byName.get(name.toLowerCase());
}

export function commandNames(): string[] {
  return [...byName.keys()].sort();
}

/** Closest command names to a typo, for the "did you mean" hint. */
function suggest(name: string): string[] {
  return commandNames()
    .filter(n => n.startsWith(name[0]) || n.includes(name) || name.includes(n))
    .slice(0, 3);
}

export interface DispatchOptions {
  /** Streams agent output as it arrives; the final lines are still returned. */
  onLine?: (line: OutputLine) => void;
}

/**
 * Execute one line.
 *
 * User error (unknown command, bad arguments) comes back as output rather than
 * a thrown error — a terminal that crashes on a typo is not a terminal. Genuine
 * faults inside a command are caught here and reported with their message, so
 * one broken command can't take the session down.
 */
export async function dispatch(
  input: string,
  ctx: CommandContext,
  opts: DispatchOptions = {},
): Promise<CommandResult> {
  const parsed = parseLine(input);

  if (parsed.isShell) {
    if (!ctx.runShell) {
      return {
        lines: [
          err('No shell available in this session.'),
          info('Run `npm run cli`, or start the dev server with ATLAS_ENABLE_SHELL=1.'),
        ],
      };
    }
    try {
      // The raw line, not the parsed one — the shell does its own quoting.
      const collected: OutputLine[] = [];
      const emit = opts.onLine ?? ((line: OutputLine) => collected.push(line));
      const { exitCode } = await ctx.runShell(input.trim(), emit);
      if (exitCode !== 0) collected.push(info(`exit ${exitCode}`));
      return { lines: collected };
    } catch (e) {
      return { lines: [err(`Shell failed: ${e instanceof Error ? e.message : String(e)}`)] };
    }
  }

  if (!parsed.name) return { lines: [] };

  const command = findCommand(parsed.name);
  if (!command) {
    const near = suggest(parsed.name);
    return {
      lines: [
        err(`Unknown command "/${parsed.name}".`),
        info(near.length ? `Did you mean ${near.map(n => `/${n}`).join(', ')}?` : 'Try /help.'),
      ],
    };
  }

  try {
    return await command.run(parsed.args, ctx, { onLine: opts.onLine });
  } catch (e) {
    return { lines: [err(`/${command.name} failed: ${e instanceof Error ? e.message : String(e)}`)] };
  }
}
