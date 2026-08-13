import { Command, CommandContext, OutputLine, out, err, info, ok, fail } from './types';
import { extractFlags } from './parse';
import { StoryCard } from '@/types';

// The command set, shared verbatim by the in-app terminal and the CLI.
//
// Commands never throw for user error — a bad argument is output, not an
// exception. Only genuine faults propagate, so the dispatcher's catch means
// "something broke", not "they typed it wrong".

const findScript = (ctx: CommandContext, name: string) => {
  const scripts = ctx.getScripts();
  const lower = name.toLowerCase();
  return (
    scripts.find(s => s.name.toLowerCase() === lower) ??
    scripts.find(s => s.name.toLowerCase().startsWith(lower))
  );
};

const bytes = (n: number) => (n < 1024 ? `${n}b` : `${(n / 1024).toFixed(1)}kb`);

// ---------------------------------------------------------------- simulation

const run: Command = {
  name: 'run',
  summary: 'Run one simulation turn',
  usage: '<input text>',
  details:
    'Runs the text through the offline engine — your scripts execute locally and\n' +
    'the AI reply is the stand-in from the Director — and prints the output.',
  async run(args, ctx) {
    const input = args.join(' ').trim();
    if (!input) return fail('Usage: /run "your input text"');
    const result = await ctx.runSimulation(input);
    const lines = [out(result.output)];
    return ok(...lines);
  },
};

// ---------------------------------------------------------------- scripts

const scripts: Command = {
  name: 'scripts',
  aliases: ['ls'],
  summary: 'List scripts',
  usage: '[--all]',
  details: 'Shows active scripts. --all includes inactive ones.',
  run(args, ctx) {
    const { flags } = extractFlags(args);
    const all = ctx.getScripts();
    const shown = flags.all ? all : all.filter(s => s.active);
    if (shown.length === 0) {
      return ok(info(all.length ? 'No active scripts (try --all).' : 'No scripts.'));
    }
    const width = Math.max(...shown.map(s => s.name.length));
    return ok(
      ...shown.map(s =>
        out(
          `${s.name.padEnd(width)}  ${bytes(s.code.length).padStart(7)}  ` +
            `${s.active ? 'active' : 'inactive'}`,
        ),
      ),
    );
  },
};

const cat: Command = {
  name: 'cat',
  summary: 'Print a script’s code',
  usage: '<script> [--lines]',
  run(args, ctx) {
    const { positional, flags } = extractFlags(args);
    if (!positional[0]) return fail('Usage: /cat <script>');
    const script = findScript(ctx, positional[0]);
    if (!script) return fail(`No script matching "${positional[0]}".`);
    const code = script.code || '';
    if (!code.trim()) return ok(info(`${script.name} is empty.`));
    const src = code.split('\n');
    const pad = String(src.length).length;
    return ok(
      ...src.map((line, i) => out(flags.lines ? `${String(i + 1).padStart(pad)}  ${line}` : line)),
    );
  },
};

const edit: Command = {
  name: 'edit',
  summary: 'Replace a script’s code',
  usage: '<script> <new code>',
  details:
    'Replaces the whole script body. Quote the code, or use the in-app editor\n' +
    'for anything longer than a line or two.',
  async run(args, ctx) {
    if (args.length < 2) return fail('Usage: /edit <script> "<new code>"');
    const [name, ...rest] = args;
    const script = findScript(ctx, name);
    if (!script) return fail(`No script matching "${name}".`);
    const code = rest.join(' ');
    await ctx.setScripts(
      ctx.getScripts().map(s =>
        s.id === script.id ? { ...s, code, lastModified: new Date().toISOString() } : s,
      ),
    );
    return ok(info(`Updated ${script.name} (${bytes(code.length)}).`));
  },
};

// ---------------------------------------------------------------- state

const state: Command = {
  name: 'state',
  summary: 'Show or set world state',
  usage: '[key] [value]',
  details:
    'No arguments prints the whole state as JSON. One argument reads a\n' +
    'dot-path. Two arguments set it — values parse as JSON when possible,\n' +
    'so `true` and `3` land as a boolean and a number, not strings.',
  async run(args, ctx) {
    const current = ctx.getWorldState();
    if (args.length === 0) return ok(out(JSON.stringify(current, null, 2)));

    const [path, ...valueParts] = args;
    const keys = path.split('.');

    if (valueParts.length === 0) {
      let cursor: unknown = current;
      for (const k of keys) {
        if (cursor === null || typeof cursor !== 'object') {
          return fail(`No value at "${path}".`);
        }
        cursor = (cursor as Record<string, unknown>)[k];
      }
      if (cursor === undefined) return fail(`No value at "${path}".`);
      return ok(out(typeof cursor === 'string' ? cursor : JSON.stringify(cursor, null, 2)));
    }

    const raw = valueParts.join(' ');
    let value: unknown = raw;
    try {
      value = JSON.parse(raw);
    } catch {
      // Bare words stay strings — `/state location Nexus` should not need quotes.
    }

    const next = structuredClone(current);
    let cursor = next as Record<string, unknown>;
    for (const k of keys.slice(0, -1)) {
      if (typeof cursor[k] !== 'object' || cursor[k] === null) cursor[k] = {};
      cursor = cursor[k] as Record<string, unknown>;
    }
    cursor[keys[keys.length - 1]] = value;
    await ctx.setWorldState(next);
    return ok(info(`${path} = ${JSON.stringify(value)}`));
  },
};

// ---------------------------------------------------------------- story cards

const cards: Command = {
  name: 'cards',
  summary: 'List story cards',
  run(_args, ctx) {
    const deck = ctx.getKnowledgeBase().storyCards ?? [];
    if (deck.length === 0) return ok(info('No story cards.'));
    return ok(
      ...deck.map(c =>
        out(`${c.title}  [${c.type}]  ${c.keywords.length ? c.keywords.join(', ') : '—'}`),
      ),
    );
  },
};

const card: Command = {
  name: 'card',
  summary: 'Add, show or remove a story card',
  usage: 'add <title> <content> | show <title> | rm <title>',
  async run(args, ctx) {
    const [sub, ...rest] = args;
    const kb = ctx.getKnowledgeBase();
    const deck = kb.storyCards ?? [];

    if (sub === 'add') {
      const [title, ...contentParts] = rest;
      if (!title) return fail('Usage: /card add <title> "<content>"');
      if (deck.some(c => c.title.toLowerCase() === title.toLowerCase())) {
        return fail(`A card titled "${title}" already exists.`);
      }
      const next: StoryCard = {
        id: `card-${Date.now()}`,
        title,
        content: contentParts.join(' '),
        keywords: [title],
        type: 'Custom',
        notes: '',
      };
      await ctx.setKnowledgeBase({ ...kb, storyCards: [...deck, next] });
      return ok(info(`Added card "${title}".`));
    }

    if (sub === 'show') {
      const title = rest.join(' ');
      const found = deck.find(c => c.title.toLowerCase() === title.toLowerCase());
      if (!found) return fail(`No card titled "${title}".`);
      return ok(
        out(`${found.title}  [${found.type}]`),
        out(`keywords: ${found.keywords.join(', ') || '—'}`),
        out(''),
        out(found.content || '(empty)'),
      );
    }

    if (sub === 'rm') {
      const title = rest.join(' ');
      const found = deck.find(c => c.title.toLowerCase() === title.toLowerCase());
      if (!found) return fail(`No card titled "${title}".`);
      await ctx.setKnowledgeBase({ ...kb, storyCards: deck.filter(c => c.id !== found.id) });
      return ok(info(`Removed card "${found.title}".`));
    }

    return fail('Usage: /card add|show|rm …');
  },
};

// ---------------------------------------------------------------- diagnostics

const doctor: Command = {
  name: 'doctor',
  summary: 'Report the engine mode and whether a shell is reachable',
  async run(_args, ctx) {
    const lines = [
      out('engine     : local (offline — scripts + your stand-in AI reply)'),
      ctx.runShell ? out('shell      : available') : info('shell      : not available here'),
      out(''),
      info('Simulations run entirely offline; no AI provider is configured or needed.'),
    ];
    return ok(...lines);
  },
};

// ---------------------------------------------------------------- shell

const sh: Command = {
  name: 'sh',
  aliases: ['!'],
  summary: 'Run a shell command (the same as typing it without a slash)',
  usage: '<command>',
  details:
    'Anything typed without a leading slash already goes to the shell, so this\n' +
    'is only needed to run something whose name collides with an Atlas command\n' +
    '— `/sh state` runs the `state` binary rather than Atlas\'s /state.',
  async run(args, ctx, opts) {
    const command = args.join(' ').trim();
    if (!command) return fail('Usage: /sh <command>');

    if (!ctx.runShell) {
      return {
        lines: [
          err('No shell available in this session.'),
          info('A browser tab has no shell of its own. Either:'),
          info('  • run `npm run cli` for a terminal with direct shell access, or'),
          info('  • start the dev server with ATLAS_ENABLE_SHELL=1 to enable the bridge.'),
        ],
      };
    }

    // Streamed when the front-end can display progressively; collected only as
    // a fallback, so output never appears twice.
    const collected: OutputLine[] = [];
    const emit = opts?.onLine ?? ((line: OutputLine) => collected.push(line));

    const { exitCode } = await ctx.runShell(command, emit);
    if (exitCode !== 0) collected.push(info(`exit ${exitCode}`));
    return { lines: collected };
  },
};

const task: Command = {
  name: 'task',
  summary: 'Run a command in its own output box, off the main terminal',
  usage: '<command>',
  details:
    'For long, noisy commands — installers especially. Output goes to a\n' +
    'collapsible panel with its own scroll instead of flooding the terminal,\n' +
    'and the terminal keeps one summary line.\n' +
    '\n' +
    'The command still runs in the same shell session, so anything it changes\n' +
    '(PATH, installed binaries) applies to later commands as usual.',
  async run(args, ctx) {
    const command = args.join(' ').trim();
    if (!command) return fail('Usage: /task <command>');
    if (!ctx.runShell) {
      return {
        lines: [
          err('No shell available in this session.'),
          info('Run `npm run cli`, or start the dev server with ATLAS_ENABLE_SHELL=1.'),
        ],
      };
    }
    // No panel here (the CLI) — run it inline, where output already scrolls in
    // a terminal the user controls.
    if (!ctx.runTask) {
      const collected: OutputLine[] = [];
      const { exitCode } = await ctx.runShell(command, line => collected.push(line));
      if (exitCode !== 0) collected.push(info(`exit ${exitCode}`));
      return { lines: collected };
    }

    return { lines: await ctx.runTask(command) };
  },
};

// ---------------------------------------------------------------- meta

const clear: Command = {
  name: 'clear',
  summary: 'Clear the screen',
  // The front-ends special-case this; running it is a no-op.
  run: () => ok(),
};

const exit: Command = {
  name: 'exit',
  aliases: ['quit'],
  summary: 'Leave the session (CLI only)',
  run: () => ({ lines: [info('Bye.')], exit: true }),
};

export const COMMANDS: Command[] = [
  run, scripts, cat, edit, state, cards, card, doctor, sh, task, clear, exit,
];

/** `help` is built here so it can see the finished list, including itself. */
export const help: Command = {
  name: 'help',
  aliases: ['?'],
  summary: 'List commands, or explain one',
  usage: '[command]',
  run(args) {
    const all = [...COMMANDS, help];
    if (args[0]) {
      const name = args[0].replace(/^\//, '').toLowerCase();
      const found = all.find(c => c.name === name || c.aliases?.includes(name));
      if (!found) return fail(`No command "${name}". Try /help.`);
      const lines = [out(`/${found.name}${found.usage ? ` ${found.usage}` : ''}`), out('')];
      lines.push(out(found.summary));
      if (found.details) {
        lines.push(out(''));
        found.details.split('\n').forEach(l => lines.push(out(l)));
      }
      if (found.aliases?.length) {
        lines.push(out(''), info(`aliases: ${found.aliases.map(a => `/${a}`).join(', ')}`));
      }
      return ok(...lines);
    }

    const width = Math.max(...all.map(c => c.name.length));
    return ok(
      info('Commands start with /. Anything else runs in your shell.'),
      out(''),
      ...all
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(c => out(`  /${c.name.padEnd(width)}  ${c.summary}`)),
      out(''),
      info('Try /help <command> for detail.'),
    );
  },
};

export const ALL_COMMANDS: Command[] = [...COMMANDS, help];
