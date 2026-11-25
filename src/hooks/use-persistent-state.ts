import { useEffect, useState } from 'react';

/**
 * `useState` that survives unmounting and restarts by mirroring the value to
 * localStorage. For small form text (the Director's boxes) that would otherwise
 * be wiped every time you switch to another view and back.
 */
export function usePersistentState(key: string, initial: string): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(() => {
    try {
      return localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage full or unavailable: the value still works for this session.
    }
  }, [key, value]);
  return [value, setValue];
}
