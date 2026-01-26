import { useState, useEffect } from 'react';

export function useVideoFrame(helios) {
    const [state, setState] = useState({
        currentFrame: helios.getState().currentFrame,
        duration: helios.duration, // Accessing from instance property
        fps: helios.fps // Accessing from instance property
    });

    useEffect(() => {
        // Update local state when helios state changes
        const update = (newState) => {
            setState({
                currentFrame: newState.currentFrame,
                duration: helios.duration,
                fps: helios.fps
            });
        };

        // Subscribe returns an unsubscribe function
        return helios.subscribe(update);
    }, [helios]);

    return state;
}
