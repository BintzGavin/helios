import React from 'react';
import { useCaptions } from './hooks/useCaptions';

export function CaptionOverlay({ helios }) {
  const activeCaptions = useCaptions(helios);

  if (!activeCaptions || activeCaptions.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '50px',
      left: 0,
      width: '100%',
      textAlign: 'center',
      pointerEvents: 'none'
    }}>
      {activeCaptions.map((cue, index) => (
        <div key={index} style={{
          display: 'inline-block',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif'
        }}>
          {cue.text}
        </div>
      ))}
    </div>
  );
}
