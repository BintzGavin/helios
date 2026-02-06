import { useState, useEffect } from 'react';
import { Helios } from '@helios-project/core';

export function useVideoFrame(helios: Helios) {
    const [frame, setFrame] = useState(helios.getState().currentFrame);

    useEffect(() => {
        const update = (state: { currentFrame: number }) => setFrame(state.currentFrame);
        return helios.subscribe(update);
    }, [helios]);

    return frame;
}
