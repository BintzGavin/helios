import { useState, useEffect } from 'react';

export function useVideoFrame(helios) {
    const [frame, setFrame] = useState(helios.getState().currentFrame);

    useEffect(() => {
        const update = (state) => setFrame(state.currentFrame);
        return helios.subscribe(update);
    }, [helios]);

    return frame;
}
