import { useState, useEffect } from 'react';

export function usePersistentState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const prefixedKey = `helios-studio:${key}`;

  // Initialize state function
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(prefixedKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      console.warn(`Failed to load state for ${key}`, e);
      return initialValue;
    }
  });

  // Update storage effect
  useEffect(() => {
    try {
      localStorage.setItem(prefixedKey, JSON.stringify(state));
    } catch (e) {
      console.warn(`Failed to save state for ${key}`, e);
    }
  }, [prefixedKey, state]);

  return [state, setState];
}
