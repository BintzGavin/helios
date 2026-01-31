import React, { useEffect } from 'react';
import { Helios } from '@helios-project/core';
import { CaptionOverlay } from './CaptionOverlay';

// Sample SRT Data
const sampleSrt = `
1
00:00:00,500 --> 00:00:02,000
Hello, welcome to Helios!

2
00:00:02,000 --> 00:00:03,500
This is a React example.

3
00:00:03,500 --> 00:00:05,000
Showing how to use captions.
`;

const helios = new Helios({
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 5, // 5 seconds
  captions: sampleSrt,
  autoSyncAnimations: true
});

// Bind to document timeline for Renderer compatibility
helios.bindToDocumentTimeline();

function App() {

  // Expose helios to window for debugging and potentially some drivers
  useEffect(() => {
    window.helios = helios;
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#222',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#555',
      fontSize: '40px'
    }}>
      Background Content
      <CaptionOverlay helios={helios} />
    </div>
  );
}

export default App;
