import { describe, expect, it } from 'vitest';
import { ScriptingService } from './scriptingService';
import { installNodeWorker } from '@/test/nodeWorker';
import type { KnowledgeBase, Script } from '@/types';

installNodeWorker();

const script = (id: string, name: string, code: string): Script => ({ id, name, code, trigger: '', description: '', active: true });
const kb: KnowledgeBase = {
  aiInstructions: '', plotEssentials: 'You are Aria, a ranger.', storyCards: [],
  storySummary: '', memoryBank: '', recentHistory: '', authorsNote: '',
};

describe('info.memoryLength', () => {
  it('lets a Context Modifier read Plot Essentials the documented way', async () => {
    const context = [
      'const modifier = (text) => {',
      '  state.plot = text.slice(0, info.memoryLength);',
      '  return { text };',
      '};',
      'modifier(text);',
    ].join('\n');
    const input = 'const modifier = (text) => {\n  state.seen = info.memoryLength === undefined;\n  return { text };\n};\nmodifier(text);';
    const res = await ScriptingService.simulateStep(
      'I look around', {}, [script('i', 'Input Modifier', input), script('c', 'Context Modifier', context)],
      'local', kb, 'AI.',
    );
    expect(res.executionError).toBeNull();
    expect(res.newState?.plot).toBe('You are Aria, a ranger.');
    // AID documents memoryLength for onModelContext only.
    expect(res.newState?.seen).toBe(true);
  });
});
