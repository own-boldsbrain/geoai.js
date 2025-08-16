import { useCallback, useRef } from 'react';

type DebouncedFunction<T extends (...args: any[]) => any> = T & { cancel: () => void };

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): DebouncedFunction<T> {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as DebouncedFunction<T>;

  // Add cancel method
  debouncedCallback.cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [timeoutRef]);

  return debouncedCallback;
}
