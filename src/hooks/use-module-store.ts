import { useSyncExternalStore, useCallback } from 'react';

export function createModuleStore<T>(options: {
  initial: T;
  getServerSnapshot?: () => T;
  onChange?: (next: T) => void;
}) {
  let value = options.initial;
  const listeners = new Set<() => void>();

  const setValue = (next: T) => {
    value = next;
    options.onChange?.(next);
    listeners.forEach(fn => fn());
  };

  const getValue = () => value;

  function useStore() {
    const subscribe = useCallback((fn: () => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }, []);

    const getSnapshot = useCallback(() => value, []);

    return useSyncExternalStore(
      subscribe,
      getSnapshot,
      options.getServerSnapshot ?? getSnapshot,
    );
  }

  return { useStore, setValue, getValue };
}
