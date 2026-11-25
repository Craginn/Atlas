// Shape-agnostic deep diff of two state values. State has no fixed schema —
// scripts invent keys — so changes are reported as dotted paths
// (`stats.hp`, `party.0.name`). Used by the State Editor and the block runner.

export interface Delta {
  path: string;
  from: unknown;
  to: unknown;
  type: 'modified' | 'added' | 'removed';
  scriptId?: string;
  scriptName?: string;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

// Deep-diff guard: state is user-authored and may be deeply nested or, once
// structured-cloned through the worker, wider than is useful to walk.
const MAX_DEPTH = 10;

// An added/removed container arrives whole (there is nothing on the other side
// to walk against), so it's emitted as a single delta and rendered as one box.
const whole = (v: unknown, path: string, type: 'added' | 'removed'): Delta[] => [
  type === 'added' ? { path, from: undefined, to: v, type } : { path, from: v, to: undefined, type },
];

export const diff = (a: unknown, b: unknown, path = '', depth = 0): Delta[] => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];

  if (depth < MAX_DEPTH && isPlainObject(a) && isPlainObject(b)) {
    return Object.keys({ ...a, ...b }).flatMap(k => {
      const next = path ? `${path}.${k}` : k;
      if (!(k in a)) return whole(b[k], next, 'added');
      if (!(k in b)) return whole(a[k], next, 'removed');
      return diff(a[k], b[k], next, depth + 1);
    });
  }

  if (depth < MAX_DEPTH && Array.isArray(a) && Array.isArray(b)) {
    return Array.from({ length: Math.max(a.length, b.length) }).flatMap((_, i) => {
      const next = `${path}.${i}`;
      if (i >= a.length) return whole(b[i], next, 'added');
      if (i >= b.length) return whole(a[i], next, 'removed');
      return diff(a[i], b[i], next, depth + 1);
    });
  }

  return [{ path: path || '(root)', from: a, to: b, type: 'modified' }];
};
