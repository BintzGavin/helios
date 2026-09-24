import React, { useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';

export const HotReloadToast: React.FC = () => {
  const { addToast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (import.meta.hot) {
      const handleUpdate = () => {
        // Debounce rapid updates
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          addToast('Composition reloaded', 'success', 2000);
        }, 100);
      };

      import.meta.hot.on('vite:beforeUpdate', handleUpdate);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [addToast]);

  return null;
};
