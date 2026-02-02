import { useState, useEffect } from 'react';

export function useVideoFrame(heliosInstance) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const helios = heliosInstance || window.helios;
    if (!helios) {
      console.warn('useVideoFrame: Helios instance not found (passed or on window)');
      return;
    }

    // Set initial frame in case we missed it
    setFrame(helios.currentFrame);

    return helios.subscribe((state) => {
      setFrame(state.currentFrame);
    });
  }, [heliosInstance]);

  return frame;
}
