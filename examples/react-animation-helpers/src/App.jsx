import React, { useState, useEffect } from 'react';
import { Helios, interpolate, spring } from '../../../packages/core/src/index.ts';
import { Sequence } from './components/Sequence';
import { Series } from './components/Series';
import { FrameContext } from './components/FrameContext';
import { useVideoFrame } from './hooks/useVideoFrame';

const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
  window.helios = helios;
}

const MovingBox = ({ color, label }) => {
  const frame = useVideoFrame();
  // Move 5px per frame
  const x = frame * 5;

  return (
    <div style={{
      position: 'absolute',
      left: `${x}px`,
      top: '100px',
      width: '100px',
      height: '100px',
      backgroundColor: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      border: '2px solid white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div>{label}</div>
        <div style={{ fontSize: '0.8em' }}>f: {frame.toFixed(0)}</div>
      </div>
    </div>
  );
};

const HelperDemo = () => {
  const frame = useVideoFrame();

  // Interpolate x position: 0 -> 200 over frames 0-60
  const x = interpolate(frame, [0, 60], [0, 200], { extrapolateRight: 'clamp' });

  // Spring scale: 0 -> 1 starting at frame 0
  const scale = spring({ frame, fps: 30, from: 0, to: 1, config: { stiffness: 100 } });

  return (
    <div style={{
      position: 'absolute',
      top: '250px',
      left: '50px',
      transform: `translateX(${x}px) scale(${scale})`,
      width: '100px',
      height: '100px',
      background: 'hotpink',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      border: '2px solid white'
    }}>
      Helpers
    </div>
  );
};

export default function App() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    return helios.subscribe((state) => setFrame(state.currentFrame));
  }, []);

  return (
    <FrameContext.Provider value={frame}>
      <div style={{ position: 'relative', width: '100%', height: '100%', background: '#222', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: 'white', margin: 0, padding: 20 }}>React Animation Helpers</h1>

        <Series>
          {/* First sequence: 0-60 frames (0s - 2s) */}
          <Sequence durationInFrames={60}>
            <MovingBox color="#ff4444" label="Seq 1" />
          </Sequence>

          {/* Second sequence: starts at 60 (automatically), runs for 60 frames (2s - 4s) */}
          <Sequence durationInFrames={60}>
            <MovingBox color="#4444ff" label="Seq 2" />
          </Sequence>
        </Series>

        <HelperDemo />
      </div>
    </FrameContext.Provider>
  );
}
