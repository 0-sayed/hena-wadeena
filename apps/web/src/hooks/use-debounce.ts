import { useEffect, useMemo, useRef, useState } from 'react';

/** Returns a debounced value that updates after the specified delay. */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export type DebouncedCallback<T extends (...args: never[]) => void> = T & {
  cancel: () => void;
};

/** Returns a debounced version of the callback (300ms default) with a `.cancel()` method. */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay = 300,
): DebouncedCallback<T> {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useMemo(
    () =>
      Object.assign(
        (...args: Parameters<T>) => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
        },
        {
          cancel: () => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          },
        },
      ) as DebouncedCallback<T>,
    [delay],
  );
}
