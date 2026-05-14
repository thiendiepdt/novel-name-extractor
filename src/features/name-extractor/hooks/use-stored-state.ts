import { useState } from 'react';

type SetStoredValue<T> = (nextValue: T | ((current: T) => T)) => void;

export function useStoredState(key: string, initialValue: string): [string, SetStoredValue<string>] {
  const [value, setValue] = useState(() => localStorage.getItem(key) || initialValue);

  function setStoredValue(nextValue: string | ((current: string) => string)) {
    const resolved = typeof nextValue === 'function' ? nextValue(value) : nextValue;
    setValue(resolved);
    if (resolved) {
      localStorage.setItem(key, resolved);
    } else {
      localStorage.removeItem(key);
    }
  }

  return [value, setStoredValue];
}

export function useStoredJsonState<T>(key: string, initialValue: T): [T, SetStoredValue<T>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return initialValue;
      const parsed = JSON.parse(stored);
      if (Array.isArray(initialValue)) return Array.isArray(parsed) ? parsed : initialValue;
      return parsed && typeof parsed === 'object' ? { ...initialValue, ...parsed } : initialValue;
    } catch {
      return initialValue;
    }
  });

  function setStoredValue(nextValue: T | ((current: T) => T)) {
    setValue((current) => {
      const resolver = nextValue as ((current: T) => T) | T;
      const resolved = typeof resolver === 'function' ? (resolver as (current: T) => T)(current) : resolver;
      localStorage.setItem(key, JSON.stringify(resolved));
      return resolved;
    });
  }

  return [value, setStoredValue];
}
