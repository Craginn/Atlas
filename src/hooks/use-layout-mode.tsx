import * as React from 'react';
import { useIsMobile } from './use-mobile';

// Layout mode is app state, not just a media query.
//
// `useIsMobile` answers "is this viewport narrow", which is the right default but
// the wrong final word: the compact layout needs to be testable on a desktop, and
// a tablet user may prefer one layout over the other regardless of width. So the
// stored preference is tri-state and the viewport only decides the `auto` case.

export type LayoutMode = 'auto' | 'mobile' | 'desktop';

const STORAGE_KEY = 'atlas.layoutMode';

function readStored(): LayoutMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'mobile' || raw === 'desktop' ? raw : 'auto';
  } catch {
    // Private-mode Safari and friends throw on localStorage access. A preference
    // we can't persist is not worth failing the render over.
    return 'auto';
  }
}

// A module-level store rather than a context provider: the preference is a
// singleton, and this keeps every consumer a one-line hook call with no wiring
// in App.tsx for a component tree that is already deeply nested.
let current: LayoutMode | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): LayoutMode {
  if (current === null) current = readStored();
  return current;
}

/** Server/prerender snapshot — no localStorage, so always the default. */
function getServerSnapshot(): LayoutMode {
  return 'auto';
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLayoutMode(next: LayoutMode) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Non-persistent is still usable for this session.
  }
  listeners.forEach(fn => fn());
}

/**
 * The resolved layout.
 *
 * `isCompact` is what components should branch on — it already folds the stored
 * override together with the viewport, so callers never repeat that logic.
 */
export function useLayoutMode() {
  const mode = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const viewportIsMobile = useIsMobile();
  const isCompact = mode === 'auto' ? viewportIsMobile : mode === 'mobile';
  return { mode, isCompact, viewportIsMobile, setMode: setLayoutMode };
}

/** Test seam — drops the cached value so each case starts from storage. */
export function __resetLayoutModeForTests() {
  current = null;
  listeners.clear();
}
