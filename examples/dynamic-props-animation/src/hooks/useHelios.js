import { useState, useEffect } from 'react';

export function useHelios(helios) {
    const [state, setState] = useState(helios.getState());

    useEffect(() => {
        const update = (s) => setState(s);
        return helios.subscribe(update);
    }, [helios]);

    return state;
}
