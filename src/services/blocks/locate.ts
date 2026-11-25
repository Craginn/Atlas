import { parseCode } from './parse';
import type { BlockNode } from './types';

// Which block holds a given line of code?
//
// Errors arrive as a line in the code that ran. That code was generated from
// (or parsed into) the current blocks, but blocks edited in the canvas carry
// stale `loc`s — so instead of trusting them, re-parse the code that ran and
// walk both trees side by side: the deepest block in the fresh parse whose
// lines contain the error, followed by position, is the same block in the
// canvas. Where the trees stop matching, the deepest matching ancestor wins.

const SLOT_ORDER = (b: BlockNode) => Object.keys(b.slots).sort();

/** Path (slot key + index per level) to the deepest block covering `line`. */
function pathTo(nodes: BlockNode[], line: number): Array<{ slot: string | null; index: number }> {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n.loc || line < n.loc.start || line > n.loc.end) continue;
    for (const slot of SLOT_ORDER(n)) {
      const inner = pathTo(n.slots[slot], line);
      if (inner.length) return [{ slot: null, index: i }, { ...inner[0], slot }, ...inner.slice(1)];
    }
    return [{ slot: null, index: i }];
  }
  return [];
}

/**
 * The id of the block in `roots` that holds `line` of `code`, where `code` is
 * what was run (generated from `roots`, or the script's own source).
 */
export function blockAtLine(roots: BlockNode[], code: string, line: number): string | null {
  if (line < 1) return null;
  const fresh = parseCode(code);
  if (fresh.parseError) return null;
  const path = pathTo(fresh.roots, line);
  let list = roots;
  let hit: BlockNode | null = null;
  for (const step of path) {
    const n = list[step.index];
    if (!n) break;
    hit = n;
    const next = path[path.indexOf(step) + 1];
    if (!next) break;
    list = n.slots[next.slot ?? ''] ?? [];
  }
  return hit?.id ?? null;
}

/** Ids of a block and all its ancestors, for auto-expanding down to it. */
export function ancestorIds(roots: BlockNode[], id: string): string[] {
  const walk = (nodes: BlockNode[], trail: string[]): string[] | null => {
    for (const n of nodes) {
      if (n.id === id) return [...trail, n.id];
      for (const list of Object.values(n.slots)) {
        const hit = walk(list, [...trail, n.id]);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(roots, []) ?? [];
}

/** The root block containing `id`. */
export function rootOf(roots: BlockNode[], id: string): BlockNode | null {
  const trail = ancestorIds(roots, id);
  return trail.length ? roots.find(r => r.id === trail[0]) ?? null : null;
}
