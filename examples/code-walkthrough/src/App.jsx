import React, { useMemo } from 'react';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './useVideoFrame';
import { CodeBlock } from './CodeBlock';
import { codeSample } from './code-sample';

// Initialize Helios
const duration = 10;
const fps = 30;
const helios = new Helios({
    duration: duration,
    fps,
    width: 1920,
    height: 1080
});

helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
    window.helios = helios;
}

function App() {
    const frame = useVideoFrame(helios);
    const time = frame / fps;

    // Define timeline for active lines
    const activeLines = useMemo(() => {
        // Simple timeline logic
        if (time < 2) return [1, 2, 3]; // import + function def
        if (time < 4) return [4]; // useState
        if (time < 6) return [6, 7, 8]; // increment
        if (time < 8) return [10, 11, 12, 13, 14, 15, 16, 17]; // return JSX
        return [20]; // export
    }, [time]);

    return (
        <div className="container">
            <div className="code-window">
                <div className="window-header">
                    <div className="dot red"></div>
                    <div className="dot yellow"></div>
                    <div className="dot green"></div>
                </div>
                <div className="window-content">
                    <CodeBlock
                        code={codeSample}
                        language="jsx"
                        activeLines={activeLines}
                    />
                </div>
            </div>
            <div style={{ position: 'absolute', bottom: 20, right: 20, color: '#666' }}>
                Frame: {frame} | Time: {time.toFixed(2)}s
            </div>
        </div>
    );
}

export default App;
