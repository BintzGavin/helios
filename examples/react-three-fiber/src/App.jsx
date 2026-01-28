import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Helios } from '../../../packages/core/src/index.ts';
import Scene from './Scene';

// Singleton Helios instance
const helios = new Helios({
    fps: 30,
    duration: 10,
    autoSyncAnimations: true
});

helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
    window.helios = helios;
}

export default function App() {
    const [r3fState, setR3fState] = useState(null);

    useEffect(() => {
        if (!r3fState) return;

        // Drive R3F loop manually
        // We subscribe to Helios ticks.
        return helios.subscribe((state) => {
            // R3F's advance(timestamp) sets the internal clock.elapsedTime to timestamp
            // and computes delta from the previous call.
            // We pass time in seconds because Three.js clocks work in seconds.
            const timeInSeconds = state.currentFrame / state.fps;

            // We explicitly advance the R3F state
            r3fState.advance(timeInSeconds);
        });
    }, [r3fState]);

    return (
        <Canvas
            frameloop="never"
            onCreated={(state) => setR3fState(state)}
            style={{ width: '100%', height: '100%', background: '#111' }}
            camera={{ position: [0, 0, 5] }}
        >
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Scene />
        </Canvas>
    );
}
