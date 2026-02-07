import { useState, useEffect } from 'react';
import type { Helios, HeliosState } from '@helios-project/core';

export function useVideoFrame(helios: Helios<any>): HeliosState<any> {
    const [state, setState] = useState<HeliosState<any>>(helios.getState());

    useEffect(() => {
        const update = (s: HeliosState<any>) => setState(s);
        return helios.subscribe(update);
    }, [helios]);

    return state;
}
