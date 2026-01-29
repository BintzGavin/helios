import React from 'react';
import { Helios } from '/packages/core/src/index.ts';
import { useVideoFrame } from './hooks/useVideoFrame';
import { Typewriter } from './components/Typewriter';
import { TextReveal } from './components/TextReveal';
import './styles.css';

// Initialize Helios
const helios = new Helios({
    width: 1920,
    height: 1080,
    fps: 30
});

export default function App() {
    const frame = useVideoFrame(helios);

    return (
        <div className="container">
            <div className="effect-box">
                <div className="label">Typewriter Effect</div>
                <Typewriter
                    text="Hello, World!"
                    frame={frame}
                    start={0}
                    end={60}
                />
            </div>

            <div className="effect-box">
                <div className="label">Staggered Reveal</div>
                <TextReveal
                    text="Helios Animation Engine"
                    frame={frame}
                    start={60}
                    stagger={3}
                    duration={15}
                />
            </div>
        </div>
    );
}
