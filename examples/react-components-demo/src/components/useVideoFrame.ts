import { useState, useEffect } from 'react';
import { Helios } from '@helios-project/core';

export function useVideoFrame(helios: Helios | undefined) {
    const [frame, setFrame] = useState(helios?.getState().currentFrame ?? 0);

    useEffect(() => {
        if (!helios) return;

        // Update local state when helios state changes
        const update = (state: any) => setFrame(state.currentFrame);

        // Subscribe returns an unsubscribe function
        return helios.subscribe(update);
    }, [helios]);

    return frame;
}
