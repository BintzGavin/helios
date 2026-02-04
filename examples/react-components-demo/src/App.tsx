import React, { useEffect, useState } from 'react';
import { Helios } from '@helios-project/core';
import { Timer } from './components/Timer';
import { ProgressBar } from './components/ProgressBar';
import { Watermark } from './components/Watermark';

function App() {
  const [helios, setHelios] = useState<Helios | undefined>(undefined);

  useEffect(() => {
    const instance = new Helios({
      fps: 30,
      duration: 10,
      width: 1920,
      height: 1080,
      autoStart: true,
      backgroundColor: '#1a1a1a'
    });

    // Expose to window for debugging and other components
    (window as any).helios = instance;
    setHelios(instance);

    return () => {
      // Cleanup if necessary, though Helios disposal isn't strictly required here
    };
  }, []);

  if (!helios) return null;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative'
    }}>
      <h1 style={{ color: 'white', fontFamily: 'sans-serif', marginBottom: '20px' }}>
        React Components Demo
      </h1>

      <div style={{ marginBottom: '20px' }}>
        <Timer helios={helios} />
      </div>

      <div style={{ width: '80%', marginBottom: '20px' }}>
        <ProgressBar helios={helios} color="#00d8ff" height="8px" />
      </div>

      <Watermark
        text="Helios Demo"
        position="bottom-right"
        opacity={0.8}
        style={{ fontSize: '18px' }}
      />

      <Watermark
        text="Top Left"
        position="top-left"
        opacity={0.5}
      />
    </div>
  );
}

export default App;
