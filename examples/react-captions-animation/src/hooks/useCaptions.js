import { useState, useEffect } from 'react';

export function useCaptions(helios) {
  const [captions, setCaptions] = useState(helios.activeCaptions.value);

  useEffect(() => {
    const unsubscribe = helios.subscribe((state) => {
      setCaptions(state.activeCaptions);
    });

    return unsubscribe;
  }, [helios]);

  return captions;
}
