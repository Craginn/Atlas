// State Sections: the logic behind the State Editor's "Sections" tab.
//
// AID's `state` has no schema — scripts invent their own top-level keys (PS, MS,
// memory, quests, …). Each top-level key becomes its own section: its own box,
// its own search hits, its own "changed last turn" marker. Kept free of React so
// it can be tested directly.

/** The subset of a State Delta (StateEditor's `diff`) this module needs. */
export interface ChangeLike {
  path: string;
  type: 'modified' | 'added' | 'removed';
  from?: unknown;
  to?: unknown;
}

export type ValueKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'other';

export interface StateSection {
  key: string;
  value: unknown;
  kind: ValueKind;
  /** Child count for objects/arrays; string length for strings. */
  count: number;
  /** Approximate serialized size in bytes (JSON length × 2, as the memory gauge). */
  bytes: number;
  /** Full dotted paths changed last turn within this section (`PS.hp`, …). */
  changes: ChangeLike[];
  /** True when the whole key was removed last turn (it has no current value). */
  removed: boolean;
  /** Position in the state object's own key order. */
  order: number;
}

export const kindOf = (v: unknown): ValueKind =>
  v === null ? 'null'
    : Array.isArray(v) ? 'array'
    : typeof v === 'object' ? 'object'
    : typeof v === 'string' ? 'string'
    : typeof v === 'number' ? 'number'
    : typeof v === 'boolean' ? 'boolean'
    : 'other';

const sizeOf = (v: unknown): number => {
  try {
    return (JSON.stringify(v) ?? '').length * 2;
  } catch {
    return 0;
  }
};

const countOf = (v: unknown): number =>
  Array.isArray(v) ? v.length
    : v && typeof v === 'object' ? Object.keys(v).length
    : typeof v === 'string' ? v.length
    : 0;

/** Top-level key of a dotted path. */
export const topKey = (path: string) => path.split('.')[0] || '(root)';

/** Split a state object into one section per top-level key, attaching last-turn changes. */
export function buildSections(state: Record<string, unknown>, changes: ChangeLike[]): StateSection[] {
  const byKey = new Map<string, ChangeLike[]>();
  for (const c of changes) {
    const k = topKey(c.path);
    const list = byKey.get(k);
    if (list) list.push(c); else byKey.set(k, [c]);
  }

  const keys = Object.keys(state ?? {});
  const sections: StateSection[] = keys.map((key, order) => {
    const value = state[key];
    return {
      key, value, order,
      kind: kindOf(value),
      count: countOf(value),
      bytes: sizeOf(value),
      changes: byKey.get(key) ?? [],
      removed: false,
    };
  });

  // Keys removed last turn have no current value but are still "what changed".
  for (const [key, list] of byKey) {
    if (key in (state ?? {})) continue;
    sections.push({
      key, value: undefined, order: keys.length + sections.length,
      kind: 'other', count: 0, bytes: 0, changes: list, removed: true,
    });
  }
  return sections;
}

export type SortMode = 'state' | 'name' | 'size' | 'changed';

export function sortSections(sections: StateSection[], mode: SortMode): StateSection[] {
  const s = [...sections];
  switch (mode) {
    case 'name':
      return s.sort((a, b) => a.key.localeCompare(b.key));
    case 'size':
      return s.sort((a, b) => b.bytes - a.bytes || a.order - b.order);
    case 'changed':
      return s.sort((a, b) => b.changes.length - a.changes.length || a.order - b.order);
    default:
      return s.sort((a, b) => a.order - b.order);
  }
}

// ------------------------------------------------------------------ search

/** Walk budget per section, so a huge array can't stall a keystroke. */
const SEARCH_NODE_BUDGET = 20_000;
const MAX_HITS = 200;

export interface SearchResult {
  /** Dotted paths (relative to the section, '' = the section itself) whose key or value matched. */
  hits: string[];
  /** Search stopped early (budget or hit cap); there may be more. */
  truncated: boolean;
}

/**
 * Find nodes inside `value` whose key or primitive value contains `query`
 * (case-insensitive). A match on the section's own key counts as a hit at ''.
 */
export function searchSection(key: string, value: unknown, query: string): SearchResult {
  const q = query.trim().toLowerCase();
  if (!q) return { hits: [], truncated: false };
  const hits: string[] = [];
  if (key.toLowerCase().includes(q)) hits.push('');
  let budget = SEARCH_NODE_BUDGET;
  let truncated = false;

  const walk = (v: unknown, path: string) => {
    if (truncated) return;
    if (--budget <= 0 || hits.length >= MAX_HITS) {
      truncated = true;
      return;
    }
    if (v && typeof v === 'object') {
      const entries = Array.isArray(v) ? v.map((x, i) => [String(i), x] as const) : Object.entries(v);
      for (const [k, child] of entries) {
        const p = path ? `${path}.${k}` : k;
        if (!Array.isArray(v) && k.toLowerCase().includes(q)) hits.push(p);
        walk(child, p);
        if (truncated) return;
      }
    } else if (v !== undefined && String(v).toLowerCase().includes(q)) {
      if (path) hits.push(path);
      else if (!hits.includes('')) hits.push('');
    }
  };
  walk(value, '');
  return { hits: [...new Set(hits)], truncated };
}

/** Every ancestor path of the given paths (so a tree can auto-expand down to them). */
export function ancestorsOf(paths: Iterable<string>): Set<string> {
  const out = new Set<string>(['']);
  for (const p of paths) {
    if (!p) continue;
    const parts = p.split('.');
    for (let i = 1; i < parts.length; i++) out.add(parts.slice(0, i).join('.'));
  }
  return out;
}

/** A section-relative path for a full state path (`PS.hp` → `hp`, `PS` → ''). */
export const relativePath = (fullPath: string) => fullPath.split('.').slice(1).join('.');
