import { Script } from '@/types';

// Loading the RPG script suite from `Mock Script Test/` into the app's script
// slots, as a debug harness.
//
// That suite is the real thing — ~8k lines of AID scripting with levels, XP,
// health, combat and spells — so running the app against it exercises far more
// of the engine than the default empty scripts do.
//
// Toggling ON snapshots whatever is in the slots first, and toggling OFF puts
// that snapshot back. A debug switch must never be able to destroy work: the
// scripts it overwrites may be the only copy of something the user was midway
// through writing.

/**
 * Fixture files, fetched only when the toggle is used.
 *
 * Not eager: Library.js alone is ~7k lines, and bundling it into the main chunk
 * would make every user pay for a debug feature they will probably never
 * enable. Vite emits it as a separate chunk instead.
 */
const FIXTURE_FILES = import.meta.glob('../../../Mock Script Test/*.js', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

/** Fixture filename → the script slot it belongs in. */
const FILE_TO_SLOT: Record<string, string> = {
  'Library.js': 'Library',
  'Input.js': 'Input Modifier',
  'Context.js': 'Context Modifier',
  'Output.js': 'Output Modifier',
};

export interface FixtureLoad {
  /** Slot name → file contents. */
  byScriptName: Record<string, string>;
  /** Files found but not mapped to a slot, so the caller can say so. */
  skipped: string[];
}

export async function loadRpgFixture(): Promise<FixtureLoad> {
  const byScriptName: Record<string, string> = {};
  const skipped: string[] = [];

  await Promise.all(
    Object.entries(FIXTURE_FILES).map(async ([path, load]) => {
      const file = path.split('/').pop() ?? path;
      const slot = FILE_TO_SLOT[file];
      if (!slot) {
        skipped.push(file);
        return;
      }
      byScriptName[slot] = await load();
    }),
  );

  return { byScriptName, skipped };
}

/** True when the fixture files are actually present in this build. */
export function fixtureAvailable(): boolean {
  return Object.keys(FIXTURE_FILES).length > 0;
}

// ---------------------------------------------------------------- snapshot

const SNAPSHOT_KEY = 'atlas.debug.rpgSnapshot';

/** Only the fields the toggle overwrites, so restoring cannot clobber anything else. */
interface Snapshot {
  savedAt: number;
  scripts: { id: string; code: string }[];
}

export function saveSnapshot(scripts: Script[]): void {
  const snapshot: Snapshot = {
    savedAt: Date.now(),
    scripts: scripts.map(s => ({ id: s.id, code: s.code })),
  };
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota or private mode. The caller checks hasSnapshot() before offering
    // to restore, so a failed save surfaces as "no snapshot" rather than as a
    // restore that silently does nothing.
  }
}

export function readSnapshot(): Snapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.scripts) ? (parsed as Snapshot) : null;
  } catch {
    return null;
  }
}

export function hasSnapshot(): boolean {
  return readSnapshot() !== null;
}

export function clearSnapshot(): void {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // Nothing useful to do; a stale snapshot is harmless.
  }
}

/**
 * Put the snapshot back.
 *
 * Scripts created since the snapshot are left alone rather than deleted — the
 * snapshot records what the toggle overwrote, not the entire world, so removing
 * anything absent from it would be destroying something it never touched.
 */
export function applySnapshot(current: Script[], snapshot: Snapshot): Script[] {
  const codeById = new Map(snapshot.scripts.map(s => [s.id, s.code]));
  return current.map(script =>
    codeById.has(script.id) ? { ...script, code: codeById.get(script.id)! } : script,
  );
}

// ---------------------------------------------------------------- toggle state

const FLAG_KEY = 'atlas.debug.rpgEnabled';

/**
 * The internal on/off flag, persisted so a reload doesn't leave the app showing
 * fixture code with the switch reading "off".
 */
export function readRpgEnabled(): boolean {
  try {
    return localStorage.getItem(FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeRpgEnabled(value: boolean): void {
  try {
    localStorage.setItem(FLAG_KEY, String(value));
  } catch {
    // Non-persistent is still usable for this session.
  }
}
