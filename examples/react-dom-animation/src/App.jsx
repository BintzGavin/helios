import React from 'react';
import { Helios } from '../../../packages/core/dist/index.js';
import { useVideoFrame } from './hooks/useVideoFrame';

const duration = 5;
const fps = 30;
const helios = new Helios({ duration, fps });

// Bind to document timeline so it can be driven by the player/renderer
helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    window.helios = helios;
}

export default function App() {
    const frame = useVideoFrame(helios);

    // Calculate animation values
    const progress = frame / (duration * fps);

    // Example: Opacity 0->1 over first second (30 frames)
    const opacity = Math.min(1, frame / 30);

    // Example: Scale pulse
    const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.2; // 2 pulses

    // Example: Rotation
    const rotation = progress * 360;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'white',
            fontFamily: 'sans-serif'
        }}>
            <div style={{
                width: 200,
                height: 200,
                backgroundColor: '#61dafb',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: opacity,
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                boxShadow: '0 0 20px rgba(97, 218, 251, 0.5)'
            }}>
                <span style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#282c34',
                    transform: `rotate(-${rotation}deg)` // Keep text upright
                }}>
                    React
                </span>
            </div>

            <div style={{ marginTop: 40, textAlign: 'center' }}>
                <p>Frame: {frame.toFixed(2)}</p>
                <p>Progress: {(progress * 100).toFixed(1)}%</p>
                <p>FPS: {fps}</p>
            </div>
        </div>
    );
}
