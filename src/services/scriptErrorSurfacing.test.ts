import { describe, it, expect, vi } from 'vitest';

// Mirror the REAL offlineSimulationService console shim: console.error output is
// captured into logs with an "ERROR:" prefix (see offlineSimulationService.ts).
// scriptingService scans for that prefix to surface caught-but-logged errors.
vi.mock('./offlineSimulationService', () => ({
  AID_GLOBALS: [],
  validateScriptSyntax: () => ({ valid: true, errors: [], warnings: [] }),
  runOfflineSimulation: async (code: string, worldState: any, input: string, _isMod: boolean, hookName: string) => {
    const logs: unknown[] = [];
    const ws = JSON.parse(JSON.stringify(worldState));
    const console2 = {
      log: (...a: unknown[]) => logs.push(a.map(String).join(' ')),
      error: (...a: unknown[]) => logs.push(['ERROR:', ...a.map(String)].join(' ')),
    };
    const noop = () => {};
    const exec = code.replace(/modifier\s*\(\s*text\s*\)\s*;?\s*$/, 'return modifier(text);');
    const wrapped =
      '(function(worldState, input, text, state, console, history, info, storyCards, memory, stop, log, addStoryCard, updateStoryCard, removeStoryCard) {\n' +
      exec + '\n})';
    try {
      const fn = (0, eval)(wrapped);
      const result = fn(ws, input, input, ws, console2, [], { actionCount: 0, characters: [], maxChars: 4000 },
        ws.storyCards || [], ws.memory || {}, false, console2.log, noop, noop, noop);
      return { newState: ws, logs, result, error: null };
    } catch (err) {
      logs.push(`[ERROR] ${hookName}: ${(err as Error).message}`);
      return { newState: worldState, logs, result: null, error: { hook: hookName, line: 'unknown', message: (err as Error).message } };
    }
  },
}));

import { ScriptingService } from './scriptingService';
import { Script } from '../types';

const inputScript = (code: string): Script[] => ([
  { id: 'i', name: 'Input Modifier', trigger: '', description: '', code, active: true },
]);

describe('the app surfaces silent (caught-and-logged) script crashes', () => {
  it('reports a caught error via scriptErrors without halting the pipeline', async () => {
    // A script that crashes but swallows the exception, only console.error-ing it —
    // exactly the "silent crash" pattern. The hook still returns normally.
    const code = `const modifier = (t) => {
      try { const x = null; x.boom(); }
      catch (e) { console.error('swallowed while attacking:', e.message); }
      return { text: t };
    };
    modifier(text);`;

    const res = await ScriptingService.simulateStep('I attack', {}, inputScript(code), 'local', undefined, 'AI.');

    // Pipeline did NOT hard-halt...
    expect(res.executionError).toBeNull();
    // ...but the caught error is surfaced instead of vanishing.
    expect(res.scriptErrors?.length).toBe(1);
    expect(res.scriptErrors?.[0]).toMatchObject({
      hook: 'Input Modifier',
      scriptId: 'i',
      line: 'unknown',
    });
    expect(res.scriptErrors?.[0].message).toMatch(/swallowed while attacking/);
    expect(res.scriptErrors?.[0].message).toMatch(/boom/);
  });

  it('a genuine uncaught throw still becomes an executionError (engine stops)', async () => {
    const code = `const modifier = (t) => { const x = null; x.boom(); return { text: t }; };
    modifier(text);`;

    const res = await ScriptingService.simulateStep('go', {}, inputScript(code), 'local', undefined, 'AI.');

    expect(res.executionError).not.toBeNull();
    expect(res.executionError?.hook).toBe('Input Modifier');
  });

  it('a clean run reports no scriptErrors', async () => {
    const code = `const modifier = (t) => { return { text: t }; }; modifier(text);`;
    const res = await ScriptingService.simulateStep('hi', {}, inputScript(code), 'local', undefined, 'AI.');
    expect(res.executionError).toBeNull();
    expect(res.scriptErrors?.length ?? 0).toBe(0);
  });
});
