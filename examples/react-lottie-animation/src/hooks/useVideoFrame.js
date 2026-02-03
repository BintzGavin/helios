import { useState, useEffect } from 'react';

export function useVideoFrame(helios) {
  const [frame, setFrame] = useState(helios.currentFrame);

  useEffect(() => {
    // Initial set
    setFrame(helios.currentFrame);

    // Subscribe to updates
    const unsubscribe = helios.subscribe((state) => {
      setFrame(state.currentFrame);
    });

    return unsubscribe;
  }, [helios]);

  return frame;
}
