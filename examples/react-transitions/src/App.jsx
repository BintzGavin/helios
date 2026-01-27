import React, { useEffect, useState } from 'react';
import { Helios } from '../../../packages/core/dist/index.js';
import { Sequence } from './components/Sequence';

// Initialize Helios outside component to avoid recreation
const helios = new Helios({
  fps: 30,
  width: 1920,
  height: 1080,
  autoSyncAnimations: true, // Key for this example: syncs CSS animations to global time
  durationInSeconds: 7 // Enough time for 3 scenes
});

// Bind to document timeline so SeekTimeDriver (which updates document.timeline) controls Helios
helios.bindToDocumentTimeline();

// Expose helios instance for Renderer/E2E
window.helios = helios;

function App() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const unsubscribe = helios.subscribe((state) => {
        setFrame(state.currentFrame);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', background: '#111', color: 'white', overflow: 'hidden', position: 'relative' }}>

      {/* Scene 1: 0 - 90 (3s) */}
      <Sequence from={0} duration={90} currentFrame={frame}>
        <div className="scene scene-1">
          <h1>Scene 1</h1>
          <p>Fading Out...</p>
        </div>
      </Sequence>

      {/* Scene 2: 60 - 150 (3s) - Overlaps 1s (30 frames) with Scene 1 */}
      {/* Starts at 2s (frame 60) */}
      <Sequence from={60} duration={90} currentFrame={frame}>
        <div className="scene scene-2">
          <h1>Scene 2</h1>
          <p>Sliding In...</p>
        </div>
      </Sequence>

      {/* Scene 3: 120 - 210 (3s) - Overlaps 1s with Scene 2 */}
      {/* Starts at 4s (frame 120) */}
      <Sequence from={120} duration={90} currentFrame={frame}>
         <div className="scene scene-3">
          <h1>Scene 3</h1>
          <p>Zooming In...</p>
        </div>
      </Sequence>

    </div>
  );
}

export default App;
