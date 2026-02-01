import React, { useState, useEffect } from 'react';
import { Excalidraw } from "@excalidraw/excalidraw";
import { Helios } from '../../../packages/core/src/index.ts';
import { useVideoFrame } from './hooks/useVideoFrame';
import { getArchitectureElements } from './diagram';

const duration = 10;
const fps = 30;
const helios = new Helios({ duration, fps });

// Bind to document timeline for preview
helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
    window.helios = helios;
}

export default function App() {
    const frame = useVideoFrame(helios);
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const [centered, setCentered] = useState(false);

    useEffect(() => {
        if (excalidrawAPI) {
            const elements = getArchitectureElements(frame);
            excalidrawAPI.updateScene({
                elements
            });

            // Center content once
            if (!centered && elements.length > 0) {
                 excalidrawAPI.scrollToContent(elements, { fitToContent: true });
                 setCentered(true);
            }
        }
    }, [frame, excalidrawAPI, centered]);

    return (
        <div style={{ height: "100vh", width: "100vw" }}>
            <Excalidraw
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                viewModeEnabled={true}
                zenModeEnabled={true}
                gridModeEnabled={false}
                initialData={{
                    appState: { viewModeEnabled: true }
                }}
            />
             <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 1000, background: 'rgba(0,0,0,0.5)', color: 'white', padding: 10, pointerEvents: 'none' }}>
                Frame: {frame.toFixed(0)}
            </div>
        </div>
    );
}
