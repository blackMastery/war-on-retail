import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delayMs` has
 * elapsed without a change. Use to throttle high-frequency state — e.g.,
 * keystrokes on the search input that would otherwise fire a network
 * request on every character.
 *
 * Implementation note: this purposefully avoids `useCallback` / refs. The
 * effect cleanup cancels the pending timer, so a value that changes mid-wait
 * resets the wait. Generic so it can debounce strings, numbers, objects, etc.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
