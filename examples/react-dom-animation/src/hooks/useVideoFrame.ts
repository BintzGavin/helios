import { useState, useEffect } from 'react';
import { Helios } from '@helios-project/core';

export function useVideoFrame(helios: Helios) {
    const [frame, setFrame] = useState(helios.getState().currentFrame);

    useEffect(() => {
        // Update local state when helios state changes
        const update = (state: { currentFrame: number }) => setFrame(state.currentFrame);

        // Subscribe returns an unsubscribe function
        return helios.subscribe(update);
    }, [helios]);

    return frame;
}
