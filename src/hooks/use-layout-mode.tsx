import * as React from 'react';
import { useIsMobile } from './use-mobile';
import { createModuleStore } from './use-module-store';

// Layout mode is app state, not just a media query.
//
// `useIsMobile` answers "is this viewport narrow", which is the right default but
// the wrong final word: the compact layout needs to be testable on a desktop, and
// a tablet user may prefer one layout over the other regardless of width. So the
// stored preference is tri-state and the viewport only decides the `auto` case.

export type LayoutMode = 'auto' | 'mobile' | 'desktop';

export const LAYOUT_CHOICES = [
  { value: 'auto' as const, label: 'Automatic', hint: 'Follow the screen size. Compact below 768px wide.' },
  { value: 'mobile' as const, label: 'Always compact', hint: 'Touch-sized controls and a stacked block list on every device.' },
  { value: 'desktop' as const, label: 'Always full', hint: 'The pan-and-zoom block canvas, even on a small screen.' },
] as const satisfies readonly { value: LayoutMode; label: string; hint: string }[];

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

/** Test seam — drops the cached value so each case starts from storage. */
export function __resetLayoutModeForTests() {
  setLayoutMode('auto');
}

const { useStore: useLayoutModeStore, setValue: setLayoutMode, getValue } = createModuleStore<LayoutMode>({
  initial: 'auto',
  getServerSnapshot: () => 'auto',
  onChange(next) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-persistent is still usable for this session.
    }
  },
});

// Prime from storage on first access (module init keeps SSR safe).
getValue();

export { setLayoutMode };

/**
 * The resolved layout.
 *
 * `isCompact` is what components should branch on — it already folds the stored
 * override together with the viewport, so callers never repeat that logic.
 */
export function useLayoutMode() {
  const mode = useLayoutModeStore();
  const viewportIsMobile = useIsMobile();
  const isCompact = mode === 'auto' ? viewportIsMobile : mode === 'mobile';
  return { mode, isCompact, viewportIsMobile, setMode: setLayoutMode };
}

