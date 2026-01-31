import { useState, useEffect } from 'react';

export function useVideoFrame(helios) {
  const [frame, setFrame] = useState(helios.currentFrame.value);

  useEffect(() => {
    const unsubscribe = helios.subscribe((state) => {
      setFrame(state.currentFrame);
    });
    return unsubscribe;
  }, [helios]);

  return frame;
}
