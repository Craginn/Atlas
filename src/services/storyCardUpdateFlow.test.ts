import { describe, it, expect, vi } from 'vitest';

// Mock the sandbox with a real, app-faithful Story Card API (createStoryCardApi),
// so updateStoryCard actually mutates the storyCards array — the thing a settings
// write / U_playerTrack does.
vi.mock('./offlineSimulationService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./offlineSimulationService')>();
  return {
    ...actual,
    validateScriptSyntax: () => ({ valid: true, errors: [], warnings: [] }),
    runOfflineSimulation: async (code: string, worldState: any, input: string) => {
      const ws = JSON.parse(JSON.stringify(worldState));
      const storyCards = Array.isArray(ws.storyCards) ? ws.storyCards : (ws.storyCards = []);
      const api = actual.createStoryCardApi(storyCards);
      const noop = () => {};
      const exec = code.replace(/modifier\s*\(\s*text\s*\)\s*;?\s*$/, 'return modifier(text);');
      const wrapped =
        '(function(worldState, input, text, state, console, history, info, storyCards, memory, stop, log, addStoryCard, updateStoryCard, removeStoryCard) {\n' +
        exec + '\n})';
      const fn = (0, eval)(wrapped);
      const result = fn(ws, input, input, ws, { log: noop, error: noop }, [], { maxChars: 4000 },
        storyCards, ws.memory || {}, false, noop, api.addStoryCard, api.updateStoryCard, api.removeStoryCard);
      return { newState: ws, logs: [], result, error: null };
    },
  };
});

import { ScriptingService, mergeScriptStoryCards } from './scriptingService';
import { Script, WorldState } from '../types';

const script = (code: string): Script[] => ([
  { id: 'i', name: 'Input Modifier', trigger: '', description: '', code, active: true },
]);

describe('script updates to an existing Story Card reach the Knowledge Base', () => {
  it('marks the card changed and the merge reflects the new content', async () => {
    // A tracking card already exists in the runtime state, like AID/U_playerTrack.
    const world: WorldState = {
      storyCards: [{ id: 'track1', keys: 'Bob', entry: '> Gold: 0\n> location: safe haven', type: 'Custom', title: 'Player SC', description: '' }],
    } as any;

    // The script rewrites a `> setting` and saves it via updateStoryCard — a
    // "fancy updateStoryCard call", exactly like CommunityUtils.setSettings.
    const code = `const modifier = (t) => {
      const card = storyCards.find(c => c.keys === 'Bob');
      const idx = storyCards.findIndex(c => c.id === card.id);
      updateStoryCard(idx, card.keys, '> Gold: 250\\n> location: labyrinth', card.type);
      return { text: t };
    };
    modifier(text);`;

    const res = await ScriptingService.simulateStep('go', world, script(code), 'local', undefined, 'AI.');

    // The changed card is flagged...
    expect(res.changedStoryCardIds).toContain('track1');
    // ...the runtime state carries the new entry...
    const runtimeCard = (res.newState?.storyCards as any[]).find(c => c.id === 'track1');
    expect(runtimeCard.entry).toBe('> Gold: 250\n> location: labyrinth');

    // ...and the KB merge now reflects the update (previously it was dropped).
    const kb = [{ id: 'track1', title: 'Player SC', content: '> Gold: 0\n> location: safe haven', keywords: ['Bob'], type: 'Custom' as const, notes: '' }];
    const merged = mergeScriptStoryCards(kb, res.newState?.storyCards, res.changedStoryCardIds);
    expect(merged[0].content).toBe('> Gold: 250\n> location: labyrinth');
  });
});
