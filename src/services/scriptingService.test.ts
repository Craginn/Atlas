import { describe, it, expect, vi, beforeEach } from 'vitest';

// The real executor runs user code in a Web Worker, which doesn't exist under the
// node test env. Mock it so these tests cover the pipeline itself: hook ordering,
// where the AI call lands, and who wins when a script claims authority.
const runOfflineSimulation = vi.fn();
vi.mock('./offlineSimulationService', () => ({
  runOfflineSimulation: (...args: unknown[]) => runOfflineSimulation(...args),
}));

import { ScriptingService, mergeScriptStoryCards, assembleContext, selectTriggeredCards, formatPlayerAction } from './scriptingService';
import { Script, KnowledgeBase, StoryCard, HistoryEntry } from '../types';

const emptyKB = (over: Partial<KnowledgeBase> = {}): KnowledgeBase => ({
  aiInstructions: '', plotEssentials: '', storyCards: [], storySummary: '',
  memoryBank: '', recentHistory: '', authorsNote: '', ...over,
});

const card = (over: Partial<StoryCard> = {}): StoryCard => ({
  id: 'c', title: 'Card', content: 'body', keywords: [], type: 'Custom', notes: '', ...over,
});

const script = (name: string): Script => ({
  id: name, name, trigger: '', description: '', code: `modifier(text)`, active: true,
});

// Records the text each hook was handed, so we can assert what the Output hook saw.
const seen: { name: string; input: string }[] = [];

beforeEach(() => {
  seen.length = 0;
  runOfflineSimulation.mockReset();
});

/** Default executor: passes state through untouched and echoes no text. */
const passthrough = (order: string[]) => {
  let i = 0;
  runOfflineSimulation.mockImplementation(async (_code, worldState, input) => {
    seen.push({ name: order[i++], input });
    return { newState: worldState, logs: [], result: null };
  });
};

describe('simulateStep — the simulated AI call', () => {
  it('hands the Output hook the AI Call text instead of an empty string', async () => {
    const scripts = [script('Input Modifier'), script('Output Modifier')];
    passthrough(['Input Modifier', 'Output Modifier']);

    const res = await ScriptingService.simulateStep(
      'go north', {}, scripts, 'local', undefined, 'You head into the woods.'
    );

    const output = seen.find(s => s.name === 'Output Modifier');
    expect(output?.input).toBe('You head into the woods.');
    expect(res.aiCall?.final).toBe('You head into the woods.');
    expect(res.aiCall?.overridden).toBe(false);
  });

  it('still runs the AI call when no Output Modifier is active', async () => {
    passthrough(['Input Modifier']);
    const res = await ScriptingService.simulateStep(
      'go north', {}, [script('Input Modifier')], 'local', undefined, 'Canned reply.'
    );
    expect(res.aiCall?.final).toBe('Canned reply.');
    expect(res.narration).toBe('Canned reply.');
  });

  it('surfaces state.message on its own channel, never as the Output or AI Call', async () => {
    // The character-creation case: the script raises a question via state.message.
    // It is a player toast — it must NOT replace the AI's returned text or the Output.
    runOfflineSimulation.mockImplementation(async (_code, worldState, input) => {
      seen.push({ name: seen.length === 0 ? 'Input Modifier' : 'Output Modifier', input });
      if (seen.length === 1) {
        return { newState: { ...worldState, message: 'What is your name?' }, logs: [], result: null };
      }
      return { newState: worldState, logs: [], result: null };
    });

    const res = await ScriptingService.simulateStep(
      'start', {}, [script('Input Modifier'), script('Output Modifier')], 'local', undefined,
      'The tavern door creaks open.'
    );

    // state.message is its own channel, attributed to the hook that set it.
    expect(res.stateMessage).toBe('What is your name?');
    expect(res.stateMessageAuthor).toBe('Input Modifier');
    // The AI Call / Output are untouched by the toast.
    expect(res.aiCall?.overridden).toBe(false);
    expect(res.aiCall?.final).toBe('The tavern door creaks open.');
    expect(res.narration).toBe('The tavern door creaks open.');
    // The Output hook sees the AI's returned text, not the toast.
    expect(seen.find(s => s.name === 'Output Modifier')?.input).toBe('The tavern door creaks open.');
  });

  it('lets a script seize the Output via state.output, over the Output hook return text', async () => {
    // The Output Modifier both returns its own text AND an earlier hook has written
    // state.output. state.output must win: it beats the modifier return { text }.
    runOfflineSimulation.mockImplementation(async (_code, worldState, input) => {
      const isInput = seen.length === 0;
      seen.push({ name: isInput ? 'Input Modifier' : 'Output Modifier', input });
      if (isInput) {
        return { newState: { ...worldState, output: 'FORCED OUTPUT.' }, logs: [], result: null };
      }
      // The Output hook tries to set the text the normal way; it should lose.
      return { newState: worldState, logs: [], result: { text: 'Modifier-authored text.' } };
    });

    const res = await ScriptingService.simulateStep(
      'go north', {}, [script('Input Modifier'), script('Output Modifier')], 'local', undefined,
      'The AI would have narrated here.'
    );

    expect(res.aiCall?.overridden).toBe(true);
    expect(res.aiCall?.reason).toBe('output');
    expect(res.aiCall?.overriddenBy).toBe('Input Modifier');
    expect(res.aiCall?.final).toBe('FORCED OUTPUT.');
    expect(res.output).toBe('FORCED OUTPUT.');
    expect(res.narration).toBe('FORCED OUTPUT.');
  });

  it('runs the Library before each hook, never as a standalone step', async () => {
    // Fire order is Library -> Input -> Library -> Context -> Library -> Output:
    // the Library is shared code concatenated ahead of every hook, not a hook of
    // its own. So the executor is never called for a bare "Library" pass, and each
    // hook's code carries the library ahead of it.
    const calls: { code: string; hook: string }[] = [];
    let i = 0;
    const order = ['Input Modifier', 'Context Modifier', 'Output Modifier'];
    runOfflineSimulation.mockImplementation(async (code, worldState, _input, _isMod, hook) => {
      calls.push({ code, hook });
      i++;
      return { newState: worldState, logs: [], result: null };
    });

    const lib: Script = { id: 'Library', name: 'Library', trigger: '', description: '', code: 'function helper() {}', active: true };
    const scripts = [script('Output Modifier'), lib, script('Context Modifier'), script('Input Modifier')];

    await ScriptingService.simulateStep('go north', {}, scripts, 'local', undefined, 'reply');

    expect(calls.map(c => c.hook)).toEqual(order);
    // Library code is prepended to every hook, and never runs on its own.
    expect(calls.every(c => c.code.includes('function helper() {}'))).toBe(true);
    expect(calls.some(c => c.hook === 'Library')).toBe(false);
  });

  it('runs the Input hook even when the player typed only whitespace', async () => {
    // Previously skipped. AID fires onInput on the Opening and on Continue/Retry,
    // none of which carry typed text, so blank input must still run the hook.
    passthrough(['Input Modifier', 'Context Modifier', 'Output Modifier']);
    await ScriptingService.simulateStep(
      '   ', {}, [script('Input Modifier'), script('Context Modifier'), script('Output Modifier')],
      'local', undefined, 'reply'
    );
    expect(seen.map(s => s.name)).toEqual(
      ['Input Modifier', 'Context Modifier', 'Output Modifier'],
    );
  });

  it('preserves the stand-in on the trace when a script stops the pipeline', async () => {
    runOfflineSimulation.mockImplementation(async (_code, worldState, input) => {
      seen.push({ name: 'Input Modifier', input });
      return { newState: worldState, logs: [], result: { text: 'Inventory: 3 potions.', stop: true } };
    });

    const res = await ScriptingService.simulateStep(
      '/inv', {}, [script('Input Modifier'), script('Output Modifier')], 'local', undefined,
      'The AI would have narrated here.'
    );

    expect(res.aiCall?.overridden).toBe(true);
    expect(res.aiCall?.reason).toBe('stop');
    expect(res.aiCall?.overriddenBy).toBe('Input Modifier');
    expect(res.aiCall?.simulated).toBe('The AI would have narrated here.');
    expect(res.aiCall?.final).toBe('Inventory: 3 potions.');
    // stop halts before the Output hook runs at all.
    expect(seen.some(s => s.name === 'Output Modifier')).toBe(false);
  });
});

describe('the Opening turn (no player input)', () => {
  // AID fires onInput on the scenario's first turn and on Continue/Retry, none of
  // which carry typed text. Engines do their setup there — character creation
  // prompts, state seeding — so skipping the hook loses all of it.
  const engineScripts = [
    script('Input Modifier'), script('Context Modifier'), script('Output Modifier'),
  ];

  /**
   * Replays the overwrite convention a real AID engine uses:
   *   Input  -> state.overwrite = true; state.output = <prompt>
   *   Output -> if (state.overwrite) { state.overwrite = false; return state.output }
   */
  const wireCharacterCreation = (prompt: string) => {
    runOfflineSimulation.mockImplementation(
      async (_code, worldState, input, _isModifier, hookName) => {
        const s = worldState ? JSON.parse(JSON.stringify(worldState)) : {};
        if (hookName === 'Input Modifier') {
          s.overwrite = true;
          s.output = prompt;
          return { newState: s, logs: [], result: { text: input } };
        }
        if (hookName === 'Output Modifier' && s.overwrite) {
          s.overwrite = false;
          return { newState: s, logs: [], result: { text: s.output } };
        }
        return { newState: s, logs: [], result: { text: input } };
      },
    );
  };

  it('runs the Input hook when the player has typed nothing', async () => {
    wireCharacterCreation('\nWhat is your name?');
    const res = await ScriptingService.simulateStep('', {}, engineScripts, 'local');

    expect(res.triggeredScriptIds).toContain('Input Modifier');
    expect(res.output).toBe('\nWhat is your name?');
  });

  it('still runs the Input hook when the player has typed something', async () => {
    wireCharacterCreation('\nWhat is your race?');
    const res = await ScriptingService.simulateStep('Gandalf', {}, engineScripts, 'local');

    expect(res.triggeredScriptIds).toContain('Input Modifier');
    expect(res.output).toBe('\nWhat is your race?');
  });

  it('hands the Input hook an empty string rather than skipping it', async () => {
    passthrough(['Input Modifier', 'Context Modifier', 'Output Modifier']);
    await ScriptingService.simulateStep('', {}, engineScripts, 'local');

    expect(seen.map(s => s.name)).toEqual(
      ['Input Modifier', 'Context Modifier', 'Output Modifier'],
    );
    expect(seen[0].input).toBe('');
  });
});

describe('modifier return shapes (AID coerces; the pipeline must too)', () => {
  it('honors a bare-string return, as a real Context Modifier ending in `return text` does', async () => {
    const scripts = [script('Context Modifier'), script('Output Modifier')];
    let i = 0;
    const order = ['Context Modifier', 'Output Modifier'];
    runOfflineSimulation.mockImplementation(async (_c, worldState, input) => {
      const name = order[i++];
      seen.push({ name, input });
      // The Context hook returns a raw string, not { text }.
      return { newState: worldState, logs: [], result: name === 'Context Modifier' ? 'censored context' : null };
    });

    const res = await ScriptingService.simulateStep('go north', {}, scripts, 'local', undefined, 'reply');

    // Before the fix, `'censored context'.text` was undefined, so the branch was
    // skipped and the AI was handed the unmodified context instead.
    expect(res.aiCall?.contextSent).toBe('censored context');
  });

  it('keeps an empty-string return instead of treating it as "no return"', async () => {
    const scripts = [script('Output Modifier')];
    runOfflineSimulation.mockImplementation(async (_c, worldState) => ({
      newState: worldState, logs: [], result: { text: '' },
    }));

    // An Output Modifier blanking the text on player death (Output.js: health <= 0).
    const res = await ScriptingService.simulateStep('go north', {}, scripts, 'local', undefined, 'You are slain.');

    expect(res.output).toBe('');
  });
});

describe('state.output override is gated on state.overwrite', () => {
  const outputScript = [script('Output Modifier')];

  it('applies state.output when state.overwrite is true', async () => {
    runOfflineSimulation.mockImplementation(async (_c, worldState) => ({
      newState: { ...worldState, output: 'You have 3 potions.', overwrite: true },
      logs: [], result: { text: 'narration' },
    }));

    const res = await ScriptingService.simulateStep('/show backpack', {}, outputScript, 'local', undefined, 'narration');
    expect(res.output).toBe('You have 3 potions.');
  });

  it('skips a stale state.output once the script has cleared state.overwrite', async () => {
    runOfflineSimulation.mockImplementation(async (_c, worldState) => ({
      newState: { ...worldState, output: 'You have 3 potions.', overwrite: false },
      logs: [], result: { text: 'You walk into the cavern.' },
    }));

    const res = await ScriptingService.simulateStep('go north', {}, outputScript, 'local', undefined, 'x');
    expect(res.output).toBe('You walk into the cavern.');
  });

  it('keeps state.output-only behavior for scripts that never use the flag', async () => {
    runOfflineSimulation.mockImplementation(async (_c, worldState) => ({
      newState: { ...worldState, output: 'seized' }, logs: [], result: { text: 'narration' },
    }));

    const res = await ScriptingService.simulateStep('go north', {}, outputScript, 'local', undefined, 'x');
    expect(res.output).toBe('seized');
  });
});

describe('formatPlayerAction', () => {
  // Only the Do form is asserted here. Say's closing and Story's framing are
  // still unconfirmed, so nothing below locks them in.
  it('frames a Do action the way AID hands it to the Input hook', () => {
    expect(formatPlayerAction('kira', 'do')).toBe('\n> You kira.\n');
  });

  it('appends the terminating period AID adds', () => {
    expect(formatPlayerAction('start game engine', 'do')).toBe('\n> You start game engine.\n');
  });

  it('leaves input the player already punctuated alone', () => {
    expect(formatPlayerAction('run!', 'do')).toBe('\n> You run!\n');
    expect(formatPlayerAction('what now?', 'do')).toBe('\n> You what now?\n');
  });

  it('returns empty for blank input rather than framing nothing', () => {
    expect(formatPlayerAction('   ', 'do')).toBe('');
  });
});

describe('the input reaching the hooks', () => {
  it('hands the Input hook the framed action, not the raw typed string', async () => {
    // The bug: Atlas passed 'kira', so an engine parsing the '> You ' prefix
    // had nothing to match and took the wrong branch.
    passthrough(['Input Modifier']);
    await ScriptingService.simulateStep(
      'kira', { history: [{ text: 'opening', type: 'start', rawText: 'opening' }] },
      [script('Input Modifier')], 'local', emptyKB(), '',
    );
    expect(seen[0].input).toBe('\n> You kira.\n');
  });

  it('leaves the opening unframed — it is AID\'s start action', async () => {
    passthrough(['Input Modifier']);
    await ScriptingService.simulateStep(
      'The guide begins.', {}, [script('Input Modifier')], 'local', emptyKB(), '',
    );
    expect(seen[0].input).toBe('The guide begins.');
  });

  it('records the turn under the action type the player picked', async () => {
    passthrough(['Input Modifier']);
    const res = await ScriptingService.simulateStep(
      'hello', { history: [{ text: 'opening', type: 'start', rawText: 'opening' }] },
      [script('Input Modifier')], 'local', emptyKB(), 'reply', 'say',
    );
    const entry = res.newHistory?.find(e => e.rawText === 'hello');
    expect(entry?.type).toBe('say');
    // …and history is no longer inside the state object.
    expect(res.newState?.history).toBeUndefined();
  });
});

describe('assembleContext', () => {
  // The layout is still a placeholder, so nothing here asserts a section format.
  // These cover only what is settled: the action reaches the context, and card
  // selection works. Add format tests alongside the real layout.
  it('puts the action in the context even when the Knowledge Base is empty', () => {
    // The regression this guards: the context used to be the Memory Bank alone,
    // so an empty Bank handed the Context hook '' and the action never shipped.
    expect(assembleContext(emptyKB(), [], 'TK').context).toContain('TK');
  });

  it('selects the story cards whose keys appear in the recent text', () => {
    const kb = emptyKB({ storyCards: [
      card({ id: 'a', title: 'Goblin', content: 'Green.', keywords: ['goblin'] }),
      card({ id: 'b', title: 'Dragon', content: 'Red.', keywords: ['dragon'] }),
    ]});
    const { triggeredCards } = assembleContext(kb, [], 'I attack the goblin');
    expect(triggeredCards.map(c => c.title)).toEqual(['Goblin']);
  });

  it('matches cards against the history window, not just the action', () => {
    const kb = emptyKB({ storyCards: [card({ title: 'Goblin', keywords: ['goblin'] })] });
    const history = [{ text: 'A goblin blocks the road.', type: 'start' as const, rawText: '' }];
    expect(assembleContext(kb, history, 'wait').triggeredCards).toHaveLength(1);
  });

  it('tolerates a missing Knowledge Base and a non-array history', () => {
    expect(assembleContext(undefined, undefined, 'solo').context).toContain('solo');
  });

  it('lays the sections out in AID assembly order', () => {
    const kb = emptyKB({
      aiInstructions: 'BEHAVE',
      plotEssentials: 'PLOT',
      storySummary: 'SUMMARY',
      memoryBank: 'BANK',
      authorsNote: 'NOTE',
      storyCards: [card({ content: 'LORE', keywords: ['goblin'] })],
    });
    const history = [{ text: 'PAST', type: 'start' as const, rawText: '' }];
    const { context } = assembleContext(kb, history, 'goblin ACTION');
    const order = ['BEHAVE', 'PLOT', 'World Lore: LORE', 'SUMMARY', 'BANK', 'PAST', 'NOTE', 'goblin ACTION'];
    const positions = order.map(s => context.indexOf(s));
    expect(positions.every(p => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('drops empty sections instead of leaving blank gaps', () => {
    // Only the action is set — the context is exactly that, no leading newlines.
    expect(assembleContext(emptyKB(), [], 'just this').context).toBe('just this');
  });

  it('lets state.memory override the Plot Essentials and Author\'s Note UI fields', () => {
    const kb = emptyKB({ plotEssentials: 'UI PLOT', authorsNote: 'UI NOTE' });
    const { context } = assembleContext(kb, [], 'act', {
      context: 'SCRIPT PLOT', authorsNote: 'SCRIPT NOTE',
    });
    expect(context).toContain('SCRIPT PLOT');
    expect(context).toContain('SCRIPT NOTE');
    expect(context).not.toContain('UI PLOT');
    expect(context).not.toContain('UI NOTE');
  });

  it('pins state.memory.frontMemory to the very end, after the last action', () => {
    const { context } = assembleContext(emptyKB(), [], 'the action', { frontMemory: 'FRONT' });
    expect(context.indexOf('FRONT')).toBeGreaterThan(context.indexOf('the action'));
    expect(context.trimEnd().endsWith('FRONT')).toBe(true);
  });
});

describe('selectTriggeredCards', () => {
  it('matches case-insensitively and on substrings, as the platform does', () => {
    const cards = [card({ keywords: ['sword'] })];
    expect(selectTriggeredCards(cards, 'He drew his BROADSWORD')).toHaveLength(1);
  });

  it('ignores blank keys so an empty card does not fire on everything', () => {
    expect(selectTriggeredCards([card({ keywords: ['', '  '] })], 'anything')).toHaveLength(0);
  });

  it('returns nothing for blank recent text', () => {
    expect(selectTriggeredCards([card({ keywords: ['a'] })], '   ')).toHaveLength(0);
  });
});

describe('the context reaching the pipeline', () => {
  it('hands the Context hook the assembled context, not an empty string', async () => {
    passthrough(['Input Modifier', 'Context Modifier']);
    await ScriptingService.simulateStep(
      'TK', {}, [script('Input Modifier'), script('Context Modifier')], 'local',
      emptyKB(), '',
    );
    const ctx = seen.find(s => s.name === 'Context Modifier')?.input ?? '';
    expect(ctx).not.toBe('');
    expect(ctx).toContain('TK');
  });

  it('builds the context from the action the Input hook rewrote', async () => {
    let i = 0;
    runOfflineSimulation.mockImplementation(async (_c, worldState, input) => {
      const name = ['Input Modifier', 'Context Modifier'][i++];
      seen.push({ name, input });
      return { newState: worldState, logs: [], result: name === 'Input Modifier' ? 'rewritten' : null };
    });
    await ScriptingService.simulateStep(
      'TK', {}, [script('Input Modifier'), script('Context Modifier')], 'local', emptyKB(), '',
    );
    // The Input hook rewrote 'TK' to 'rewritten'; the context must be built from
    // the rewrite, not the raw input.
    const ctx = seen.find(s => s.name === 'Context Modifier')?.input ?? '';
    expect(ctx).toContain('rewritten');
    expect(ctx).not.toContain('TK');
  });

  it('still sends a context to the AI call when no Context Modifier is active', async () => {
    passthrough(['Input Modifier']);
    const res = await ScriptingService.simulateStep(
      'TK', {}, [script('Input Modifier')], 'local', emptyKB({ memoryBank: 'M' }), 'reply',
    );
    expect(res.aiCall?.contextSent).toContain('TK');
  });

  it("reports the Context hook's rewrite as what was sent to the model", async () => {
    let i = 0;
    runOfflineSimulation.mockImplementation(async (_c, worldState, input) => {
      const name = ['Context Modifier', 'Output Modifier'][i++];
      seen.push({ name, input });
      return { newState: worldState, logs: [], result: name === 'Context Modifier' ? 'censored' : null };
    });
    const res = await ScriptingService.simulateStep(
      'TK', {}, [script('Context Modifier'), script('Output Modifier')], 'local', emptyKB(), 'reply',
    );
    expect(res.aiCall?.contextSent).toBe('censored');
  });

  it('reports the cards the context injected', async () => {
    passthrough(['Input Modifier']);
    const kb = emptyKB({ storyCards: [card({ title: 'Goblin', keywords: ['goblin'] })] });
    const res = await ScriptingService.simulateStep(
      'attack the goblin', {}, [script('Input Modifier')], 'local', kb, 'reply',
    );
    expect(res.triggeredCards).toEqual(['Goblin']);
  });
});

describe('script-created story cards reaching the Knowledge Base', () => {
  const kbCard = (id: string, title: string) => ({
    id, title, content: 'body', keywords: ['k'], type: 'Custom' as const, notes: '',
  });

  it('appends a card a script created', () => {
    const merged = mergeScriptStoryCards([kbCard('a', 'Existing')], [
      { id: 'a', keys: 'k', entry: 'body', type: 'Custom', title: 'Existing', description: '' },
      { id: 'b', keys: 'goblin, boss', entry: 'A goblin king.', type: 'Character', title: 'Goblin King', description: 'note' },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged[1]).toEqual({
      id: 'b', title: 'Goblin King', content: 'A goblin king.',
      keywords: ['goblin', 'boss'], type: 'Character', notes: 'note',
    });
  });

  it('never clobbers a card the user edited after the run seeded it', () => {
    // The sandbox seeds from the KB only on the first run, so its copy goes
    // stale. A wholesale replace would silently revert the user's edit.
    const edited = [{ ...kbCard('a', 'Renamed by user'), content: 'user text' }];
    const merged = mergeScriptStoryCards(edited, [
      { id: 'a', keys: 'k', entry: 'STALE sandbox copy', type: 'Custom', title: 'Old Name', description: '' },
    ]);
    expect(merged).toEqual(edited);
  });

  it('returns the same array reference when nothing was added', () => {
    // Identity is load-bearing: the caller skips the setState when unchanged.
    const existing = [kbCard('a', 'Existing')];
    expect(mergeScriptStoryCards(existing, [{ id: 'a', title: 'Existing' }])).toBe(existing);
  });

  it('falls back to Custom for a type outside the editor union', () => {
    const [card] = mergeScriptStoryCards([], [{ id: 'x', type: 'Monster', title: 'M' }]);
    expect(card.type).toBe('Custom');
  });

  it('drops blank keyword segments from a trailing comma', () => {
    const [card] = mergeScriptStoryCards([], [{ id: 'x', keys: 'a, b, ', title: 'T' }]);
    expect(card.keywords).toEqual(['a', 'b']);
  });

  it('tolerates a state with no storyCards at all', () => {
    const existing = [kbCard('a', 'Existing')];
    expect(mergeScriptStoryCards(existing, undefined)).toBe(existing);
  });

  it('reflects a script UPDATE to an existing card when its id is in the changed set', () => {
    // The setSettings / updateStoryCard case: an existing tracking card whose
    // `> setting` line a script rewrote must show the new content in the view.
    const before = [{ ...kbCard('a', 'Tracker'), content: '> Gold: 0' }];
    const merged = mergeScriptStoryCards(before, [
      { id: 'a', keys: 'k', entry: '> Gold: 100', type: 'Custom', title: 'Tracker', description: '' },
    ], ['a']);
    expect(merged).toHaveLength(1);
    expect(merged[0].content).toBe('> Gold: 100');
  });

  it('does NOT update an existing card whose id is not in the changed set (preserves user edits)', () => {
    const edited = [{ ...kbCard('a', 'Renamed'), content: 'user text' }];
    const merged = mergeScriptStoryCards(edited, [
      { id: 'a', keys: 'k', entry: 'stale sandbox copy', type: 'Custom', title: 'Old', description: '' },
    ], ['b']); // 'a' is not in the changed set
    expect(merged).toBe(edited);
  });

  it('updates an existing card AND appends a new one in the same run', () => {
    const before = [{ ...kbCard('a', 'Tracker'), content: '> HP: 10' }];
    const merged = mergeScriptStoryCards(before, [
      { id: 'a', keys: 'k', entry: '> HP: 5', type: 'Custom', title: 'Tracker', description: '' },
      { id: 'b', keys: 'goblin', entry: 'A goblin.', type: 'Character', title: 'Goblin', description: '' },
    ], ['a', 'b']);
    expect(merged.map(c => c.id)).toEqual(['a', 'b']);
    expect(merged[0].content).toBe('> HP: 5');
  });
});
