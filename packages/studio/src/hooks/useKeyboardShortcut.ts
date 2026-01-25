import { useEffect, useRef } from 'react';

export const useKeyboardShortcut = (
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: { ctrlOrCmd?: boolean; preventDefault?: boolean } = {}
) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (options.ctrlOrCmd) {
        if (!e.ctrlKey && !e.metaKey) return;
      }

      if (e.key.toLowerCase() === key.toLowerCase()) {
        if (options.preventDefault) {
          e.preventDefault();
        }
        callbackRef.current(e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, options.ctrlOrCmd, options.preventDefault]);
};
