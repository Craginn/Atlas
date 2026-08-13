import { describe, it, expect, vi } from 'vitest';
import { tokenize, parseLine, extractFlags } from './parse';
import { dispatch } from './dispatch';
import { CommandContext, OutputLine } from './types';
import { Script, WorldState, KnowledgeBase } from '@/types';

// ---------------------------------------------------------------- harness

function makeCtx(over: Partial<CommandContext> = {}): CommandContext & { state: WorldState } {
  let scripts: Script[] = [
    { id: '1', name: 'Library', trigger: '', description: '', code: 'const a = 1;', active: true },
    { id: '2', name: 'Input', trigger: '', description: '', code: '', active: false },
  ];
  let world: WorldState = { location: 'Nexus', stats: { hp: 10 } };
  let kb: KnowledgeBase = {
    aiInstructions: '', plotEssentials: '', storySummary: '', memoryBank: '',
    recentHistory: '', authorsNote: '', storyCards: [],
  };

  const ctx: CommandContext & { state: WorldState } = {
    getScripts: () => scripts,
    setScripts: next => { scripts = next; },
    getWorldState: () => world,
    setWorldState: next => { world = next; },
    getKnowledgeBase: () => kb,
    setKnowledgeBase: next => { kb = next; },
    runSimulation: async input => ({ output: `simulated: ${input}` }),
    get state() { return world; },
    ...over,
  };
  return ctx;
}

const text = (lines: OutputLine[]) => lines.map(l => l.text).join('\n');

// ---------------------------------------------------------------- parsing

describe('tokenize', () => {
  it('keeps a quoted sentence as one argument', () => {
    // The whole point: /run "you draw a sword" is two tokens, not five.
    expect(tokenize('run "you draw a sword"')).toEqual(['run', 'you draw a sword']);
    expect(tokenize("run 'you draw a sword'")).toEqual(['run', 'you draw a sword']);
  });

  it('handles an escaped quote inside a quoted run', () => {
    expect(tokenize('say "he said \\"hi\\""')).toEqual(['say', 'he said "hi"']);
  });

  it('preserves an empty quoted argument', () => {
    expect(tokenize('edit Library ""')).toEqual(['edit', 'Library', '']);
  });

  it('does not lose text after an unclosed quote', () => {
    // Someone mid-type shouldn't have their input discarded.
    expect(tokenize('run "half a sen')).toEqual(['run', 'half a sen']);
  });

  it('collapses runs of whitespace', () => {
    expect(tokenize('  a   b  ')).toEqual(['a', 'b']);
  });
});

describe('parseLine', () => {
  it('treats a leading slash as a command', () => {
    expect(parseLine('/run hello')).toMatchObject({ name: 'run', args: ['hello'] });
  });

  it('lowercases the command but not the arguments', () => {
    expect(parseLine('/CAT Library')).toMatchObject({ name: 'cat', args: ['Library'] });
  });

  it('routes anything else to the shell', () => {
    expect(parseLine('ls -la')).toMatchObject({ isShell: true });
    expect(parseLine('curl -fsSL https://x.sh | bash')).toMatchObject({ isShell: true });
  });

  it('treats a path as shell input, not an Atlas command', () => {
    // /usr/bin/env must run, not be read as an Atlas verb called "usr".
    expect(parseLine('/usr/bin/env node')).toMatchObject({ isShell: true, name: '' });
    expect(parseLine('/bin/ls')).toMatchObject({ isShell: true });
  });

  it('treats a bare slash as a typo, not shell input', () => {
    expect(parseLine('/')).toEqual({ name: '', args: [], isShell: false });
  });

  it('treats empty input as nothing at all', () => {
    expect(parseLine('   ')).toMatchObject({ isShell: false, name: '' });
  });
});

describe('extractFlags', () => {
  it('separates flags from positional arguments', () => {
    expect(extractFlags(['Library', '--lines', '--n=3'])).toEqual({
      positional: ['Library'],
      flags: { lines: true, n: '3' },
    });
  });
});

// ---------------------------------------------------------------- dispatch

describe('dispatch', () => {
  it('reports an unknown command instead of throwing', async () => {
    const res = await dispatch('/nope', makeCtx());
    expect(text(res.lines)).toMatch(/Unknown command/);
  });

  it('suggests a near miss', async () => {
    const res = await dispatch('/scrip', makeCtx());
    expect(text(res.lines)).toMatch(/scripts/);
  });

  it('sends bare input to the shell, unsplit', async () => {
    // The line must arrive exactly as typed: the shell owns quoting and pipes.
    let seen = '';
    const runShell = vi.fn(async (cmd: string) => {
      seen = cmd;
      return { exitCode: 0 };
    });
    await dispatch('echo "a  b" | tr a A', makeCtx({ runShell }));
    expect(seen).toBe('echo "a  b" | tr a A');
  });

  it('explains itself when no shell is available', async () => {
    const res = await dispatch('ls', makeCtx());
    expect(text(res.lines)).toMatch(/No shell available/);
    expect(text(res.lines)).toMatch(/npm run cli/);
  });

  it('reports a non-zero exit from bare shell input', async () => {
    const res = await dispatch('false', makeCtx({ runShell: async () => ({ exitCode: 1 }) }));
    expect(text(res.lines)).toMatch(/exit 1/);
  });

  it('catches a throwing command rather than killing the session', async () => {
    const res = await dispatch('/run boom', makeCtx({
      runSimulation: async () => { throw new Error('provider exploded'); },
    }));
    expect(text(res.lines)).toMatch(/provider exploded/);
  });

  it('catches a throwing shell rather than killing the session', async () => {
    const res = await dispatch('boom', makeCtx({
      runShell: async () => { throw new Error('spawn failed'); },
    }));
    expect(text(res.lines)).toMatch(/Shell failed: spawn failed/);
  });
});

// ---------------------------------------------------------------- commands

describe('commands', () => {
  it('/scripts lists active scripts, --all includes inactive', async () => {
    const ctx = makeCtx();
    expect(text((await dispatch('/scripts', ctx)).lines)).toMatch(/Library/);
    expect(text((await dispatch('/scripts', ctx)).lines)).not.toMatch(/Input/);
    expect(text((await dispatch('/scripts --all', ctx)).lines)).toMatch(/Input/);
  });

  it('/ls is an alias for /scripts', async () => {
    expect(text((await dispatch('/ls', makeCtx())).lines)).toMatch(/Library/);
  });

  it('/cat prints code, and --lines numbers it', async () => {
    const ctx = makeCtx();
    expect(text((await dispatch('/cat Library', ctx)).lines)).toBe('const a = 1;');
    expect(text((await dispatch('/cat Library --lines', ctx)).lines)).toBe('1  const a = 1;');
  });

  it('/cat matches a script by prefix', async () => {
    expect(text((await dispatch('/cat Lib', makeCtx())).lines)).toBe('const a = 1;');
  });

  it('/cat reports a missing script without throwing', async () => {
    expect(text((await dispatch('/cat Nope', makeCtx())).lines)).toMatch(/No script matching/);
  });

  it('/edit replaces the body and persists it', async () => {
    const ctx = makeCtx();
    await dispatch('/edit Library "const b = 2;"', ctx);
    expect(ctx.getScripts().find(s => s.name === 'Library')?.code).toBe('const b = 2;');
  });

  it('/state prints everything, reads a dot-path, and writes one', async () => {
    const ctx = makeCtx();
    expect(text((await dispatch('/state', ctx)).lines)).toMatch(/"location": "Nexus"/);
    expect(text((await dispatch('/state stats.hp', ctx)).lines)).toBe('10');

    await dispatch('/state stats.hp 25', ctx);
    expect(ctx.getWorldState().stats.hp).toBe(25);
  });

  it('/state parses JSON values but leaves bare words as strings', async () => {
    const ctx = makeCtx();
    await dispatch('/state flags.seen true', ctx);
    await dispatch('/state location Riverwood', ctx);
    expect(ctx.getWorldState().flags.seen).toBe(true);
    expect(ctx.getWorldState().location).toBe('Riverwood');
  });

  it('/state creates missing intermediate objects', async () => {
    const ctx = makeCtx();
    await dispatch('/state deep.nested.key 1', ctx);
    expect(ctx.getWorldState().deep.nested.key).toBe(1);
  });

  it('/state does not mutate the object it was given', async () => {
    // The React front-end relies on a new reference to re-render.
    const ctx = makeCtx();
    const before = ctx.getWorldState();
    await dispatch('/state stats.hp 99', ctx);
    expect(before.stats.hp).toBe(10);
    expect(ctx.getWorldState()).not.toBe(before);
  });

  it('/card add, show and rm round-trip through the deck', async () => {
    const ctx = makeCtx();
    await dispatch('/card add Gandalf "A wandering wizard."', ctx);
    expect(ctx.getKnowledgeBase().storyCards).toHaveLength(1);
    expect(text((await dispatch('/cards', ctx)).lines)).toMatch(/Gandalf/);
    expect(text((await dispatch('/card show Gandalf', ctx)).lines)).toMatch(/wandering wizard/);

    await dispatch('/card rm Gandalf', ctx);
    expect(ctx.getKnowledgeBase().storyCards).toHaveLength(0);
  });

  it('/card add refuses a duplicate title', async () => {
    const ctx = makeCtx();
    await dispatch('/card add Gandalf "one"', ctx);
    const res = await dispatch('/card add Gandalf "two"', ctx);
    expect(text(res.lines)).toMatch(/already exists/);
    expect(ctx.getKnowledgeBase().storyCards).toHaveLength(1);
  });

  it('/run passes input through and prints the output', async () => {
    const res = await dispatch('/run "you draw a sword"', makeCtx());
    expect(text(res.lines)).toBe('simulated: you draw a sword');
  });

  it('/run without input explains the usage', async () => {
    expect(text((await dispatch('/run', makeCtx())).lines)).toMatch(/Usage/);
  });

  it('/doctor reports the offline engine and shell status', async () => {
    const rendered = text((await dispatch('/doctor', makeCtx())).lines);
    expect(rendered).toMatch(/engine\s+: local/);
    expect(rendered).toMatch(/shell\s+:/);
    expect(rendered).toMatch(/offline/);
  });

  it('/help lists commands, and explains one', async () => {
    expect(text((await dispatch('/help', makeCtx())).lines)).toMatch(/\/run/);
    const one = text((await dispatch('/help run', makeCtx())).lines);
    expect(one).toMatch(/\/run <input text>/);
  });

  it('/exit signals the session to end', async () => {
    expect((await dispatch('/exit', makeCtx())).exit).toBe(true);
  });
});

// ---------------------------------------------------------------- shell

describe('/sh', () => {
  it('explains how to get a shell when none is available', async () => {
    // The browser case: a page cannot spawn a process, so say so usefully
    // rather than failing against an endpoint that isn't there.
    const rendered = text((await dispatch('/sh echo hi', makeCtx())).lines);
    expect(rendered).toMatch(/No shell available/);
    expect(rendered).toMatch(/npm run cli/);
    expect(rendered).toMatch(/ATLAS_ENABLE_SHELL=1/);
  });

  it('passes the whole command through unsplit, so pipes survive', async () => {
    // `curl … | bash` must reach the shell intact; tokenizing it would break it.
    let seen = '';
    const ctx = makeCtx({
      runShell: async cmd => {
        seen = cmd;
        return { exitCode: 0 };
      },
    });
    await dispatch('/sh curl -fsSL https://example.com/i.sh | bash', ctx);
    expect(seen).toBe('curl -fsSL https://example.com/i.sh | bash');
  });

  it('streams output when the front-end can display it, without duplicating', async () => {
    const streamed: string[] = [];
    const ctx = makeCtx({
      runShell: async (_cmd, onChunk) => {
        onChunk({ kind: 'out', text: 'line one' });
        onChunk({ kind: 'out', text: 'line two' });
        return { exitCode: 0 };
      },
    });
    const res = await dispatch('/sh whatever', ctx, {
      onLine: l => streamed.push(l.text),
    });
    expect(streamed).toEqual(['line one', 'line two']);
    // Already shown live — repeating them in the result would double the output.
    expect(res.lines).toHaveLength(0);
  });

  it('collects output when there is nowhere to stream it', async () => {
    const ctx = makeCtx({
      runShell: async (_cmd, onChunk) => {
        onChunk({ kind: 'out', text: 'collected' });
        return { exitCode: 0 };
      },
    });
    const res = await dispatch('/sh whatever', ctx);
    expect(text(res.lines)).toMatch(/collected/);
  });

  it('reports a non-zero exit code', async () => {
    const ctx = makeCtx({ runShell: async () => ({ exitCode: 3 }) });
    expect(text((await dispatch('/sh false', ctx)).lines)).toMatch(/exit 3/);
  });

  it('says nothing about exit code on success', async () => {
    const ctx = makeCtx({ runShell: async () => ({ exitCode: 0 }) });
    expect(text((await dispatch('/sh true', ctx)).lines)).not.toMatch(/exit/);
  });
});
