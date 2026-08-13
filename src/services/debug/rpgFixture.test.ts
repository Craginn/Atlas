// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSnapshot, readSnapshot, hasSnapshot, clearSnapshot, applySnapshot,
  readRpgEnabled, writeRpgEnabled,
} from './rpgFixture';
import { Script } from '@/types';

const script = (id: string, name: string, code: string): Script => ({
  id, name, trigger: '', description: '', code, active: true,
});

beforeEach(() => localStorage.clear());

describe('snapshot / restore', () => {
  it('round-trips the code that was in the slots', () => {
    const before = [
      script('s1', 'Library', 'const mine = 1;'),
      script('s2', 'Input Modifier', 'my input code'),
    ];
    saveSnapshot(before);

    // Toggle ON would overwrite both slots with fixture code.
    const overwritten = [
      script('s1', 'Library', 'FIXTURE LIBRARY'),
      script('s2', 'Input Modifier', 'FIXTURE INPUT'),
    ];

    const restored = applySnapshot(overwritten, readSnapshot()!);
    expect(restored.map(s => s.code)).toEqual(['const mine = 1;', 'my input code']);
  });

  it('leaves scripts created after the snapshot alone', () => {
    // The snapshot records what the toggle overwrote, not the whole world —
    // deleting anything absent from it would destroy something never touched.
    saveSnapshot([script('s1', 'Library', 'original')]);

    const current = [
      script('s1', 'Library', 'FIXTURE'),
      script('s9', 'New Script', 'written after the toggle'),
    ];
    const restored = applySnapshot(current, readSnapshot()!);

    expect(restored).toHaveLength(2);
    expect(restored[0].code).toBe('original');
    expect(restored[1].code).toBe('written after the toggle');
  });

  it('preserves fields other than code', () => {
    saveSnapshot([script('s1', 'Library', 'original')]);
    const current = [{ ...script('s1', 'Library', 'FIXTURE'), active: false, trigger: 'x' }];
    const restored = applySnapshot(current, readSnapshot()!);

    expect(restored[0].code).toBe('original');
    expect(restored[0].active).toBe(false);
    expect(restored[0].trigger).toBe('x');
  });

  it('restores empty code, rather than treating it as nothing to restore', () => {
    // An empty slot is a real prior state; falling back to the fixture text
    // because the snapshot was falsy would be a silent overwrite.
    saveSnapshot([script('s1', 'Library', '')]);
    const restored = applySnapshot([script('s1', 'Library', 'FIXTURE')], readSnapshot()!);
    expect(restored[0].code).toBe('');
  });

  it('reports no snapshot before one is taken, and after clearing', () => {
    expect(hasSnapshot()).toBe(false);
    saveSnapshot([script('s1', 'Library', 'x')]);
    expect(hasSnapshot()).toBe(true);
    clearSnapshot();
    expect(hasSnapshot()).toBe(false);
  });

  it('treats a corrupt snapshot as absent rather than throwing', () => {
    localStorage.setItem('atlas.debug.rpgSnapshot', '{not json');
    expect(readSnapshot()).toBeNull();
    expect(hasSnapshot()).toBe(false);
  });

  it('rejects a snapshot with the wrong shape', () => {
    localStorage.setItem('atlas.debug.rpgSnapshot', JSON.stringify({ scripts: 'nope' }));
    expect(readSnapshot()).toBeNull();
  });
});

describe('the enabled flag', () => {
  it('defaults to off and persists what is written', () => {
    expect(readRpgEnabled()).toBe(false);
    writeRpgEnabled(true);
    expect(readRpgEnabled()).toBe(true);
    writeRpgEnabled(false);
    expect(readRpgEnabled()).toBe(false);
  });

  it('reads anything other than "true" as off', () => {
    localStorage.setItem('atlas.debug.rpgEnabled', 'yes');
    expect(readRpgEnabled()).toBe(false);
  });
});
