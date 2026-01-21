import { useState, useEffect } from 'react';

export function useVideoFrame(helios) {
    const [frame, setFrame] = useState(helios.getState().currentFrame);

    useEffect(() => {
        // Update local state when helios state changes
        const update = (state) => setFrame(state.currentFrame);

        // Subscribe returns an unsubscribe function
        return helios.subscribe(update);
    }, [helios]);

    return frame;
}
