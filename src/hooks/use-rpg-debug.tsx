import * as React from 'react';
import { Script } from '@/types';
import {
  loadRpgFixture, fixtureAvailable, saveSnapshot, readSnapshot, applySnapshot,
  clearSnapshot, hasSnapshot, readRpgEnabled, writeRpgEnabled,
} from '@/services/debug/rpgFixture';

// The RPG debug toggle.
//
// ON  → snapshot the current script code, then load the fixture suite into the
//       matching slots.
// OFF → put the snapshot back.
//
// The flag is module-level rather than component state so the Settings switch
// and any other caller see the same value, and so it survives the panel closing.

let enabled = readRpgEnabled();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = () => enabled;

export interface RpgDebugResult {
  ok: boolean;
  message: string;
}

export function useRpgDebug(
  scripts: Script[],
  setScripts: React.Dispatch<React.SetStateAction<Script[]>>,
) {
  const isEnabled = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [busy, setBusy] = React.useState(false);

  // Read through a ref: toggling is async, and `scripts` captured at render
  // time would be stale by the time the fixture finishes loading.
  const scriptsRef = React.useRef(scripts);
  scriptsRef.current = scripts;

  const enable = React.useCallback(async (): Promise<RpgDebugResult> => {
    if (!fixtureAvailable()) {
      return {
        ok: false,
        message: 'No fixture files found — expected `Mock Script Test/*.js` in the repo.',
      };
    }

    setBusy(true);
    try {
      // Snapshot before touching anything, so a failure part-way through still
      // leaves a way back.
      saveSnapshot(scriptsRef.current);

      const { byScriptName, skipped } = await loadRpgFixture();
      const loaded: string[] = [];

      setScripts(prev =>
        prev.map(script => {
          const code = byScriptName[script.name];
          if (code === undefined) return script;
          loaded.push(script.name);
          return { ...script, code, lastModified: new Date().toISOString() };
        }),
      );

      enabled = true;
      writeRpgEnabled(true);
      notify();

      const parts = [`Loaded RPG fixture into ${loaded.length} script slot(s).`];
      if (skipped.length) parts.push(`Skipped unmapped file(s): ${skipped.join(', ')}.`);
      parts.push('Your previous code is saved — turn this off to restore it.');
      return { ok: true, message: parts.join(' ') };
    } catch (e) {
      return {
        ok: false,
        message: `Could not load the fixture: ${e instanceof Error ? e.message : String(e)}`,
      };
    } finally {
      setBusy(false);
    }
  }, [setScripts]);

  const disable = React.useCallback((): RpgDebugResult => {
    const snapshot = readSnapshot();
    if (!snapshot) {
      // Never blank the slots as a guess at what "off" means — that would be
      // exactly the data loss the snapshot exists to prevent.
      enabled = false;
      writeRpgEnabled(false);
      notify();
      return {
        ok: false,
        message:
          'Turned off, but there is no snapshot to restore — the fixture code is still in the ' +
          'slots. Clear or replace it yourself.',
      };
    }

    setScripts(prev => applySnapshot(prev, snapshot));
    clearSnapshot();
    enabled = false;
    writeRpgEnabled(false);
    notify();
    return { ok: true, message: 'Restored the code that was in the slots before.' };
  }, [setScripts]);

  const toggle = React.useCallback(
    (next: boolean) => (next ? enable() : Promise.resolve(disable())),
    [enable, disable],
  );

  return {
    enabled: isEnabled,
    busy,
    available: fixtureAvailable(),
    canRestore: hasSnapshot(),
    enable,
    disable,
    toggle,
  };
}
