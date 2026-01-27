import React from 'react';
import { Helios } from '../../../packages/core/src/index.ts';
import { useHelios } from './hooks/useHelios';

// 1. Define Schema
const schema = {
    title: { type: 'string', default: 'Dynamic Title' },
    subtitle: { type: 'string', default: 'Change me via props' },
    backgroundColor: { type: 'color', default: '#ffffff' },
    textColor: { type: 'color', default: '#000000' },
    scale: { type: 'number', minimum: 0.5, maximum: 2.0, default: 1.0 },
    showSubtitle: { type: 'boolean', default: true }
};

// 2. Initialize Helios
const helios = new Helios({
    duration: 5,
    fps: 30,
    schema,
    inputProps: {
        title: 'Dynamic Title',
        scale: 1.0
    }
});

helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
    window.helios = helios;
}

export default function App() {
    const state = useHelios(helios);
    const { inputProps, currentFrame, fps } = state;

    const time = currentFrame / fps;

    // Demonstrate using props in animation
    const pulse = Math.sin(time * 2) * 0.1;
    const currentScale = (inputProps.scale || 1) + pulse;

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: inputProps.backgroundColor,
            color: inputProps.textColor,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            overflow: 'hidden'
        }}>
            <div style={{ transform: `scale(${currentScale})`, textAlign: 'center' }}>
                <h1 style={{ margin: 0 }}>{inputProps.title}</h1>
                {inputProps.showSubtitle && (
                    <p style={{ marginTop: '0.5em', opacity: 0.8 }}>{inputProps.subtitle}</p>
                )}
            </div>
            <div style={{ position: 'absolute', bottom: 20, fontSize: '12px', opacity: 0.5 }}>
                Frame: {Math.round(currentFrame)}
            </div>
        </div>
    );
}
