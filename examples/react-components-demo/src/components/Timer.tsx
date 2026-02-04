import React from 'react';
import { useVideoFrame } from './useVideoFrame';
import { Helios } from '@helios-project/core';

interface TimerProps {
  helios?: Helios;
  style?: React.CSSProperties;
}

export const Timer: React.FC<TimerProps> = ({ helios: propHelios, style }) => {
  const heliosInstance = propHelios || (typeof window !== 'undefined' ? (window as any).helios : null);
  const frame = useVideoFrame(heliosInstance);

  if (!heliosInstance) {
     return <div style={style}>Helios instance not found</div>;
  }

  // Access fps via signal value
  const fps = heliosInstance.fps.value || 30;
  const time = frame / fps;

  // Format time as MM:SS:FF
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const frames = Math.floor(frame % fps);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: '24px',
      color: 'white',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: '8px 12px',
      borderRadius: '4px',
      ...style
    }}>
      {pad(minutes)}:{pad(seconds)}:{pad(frames)}
    </div>
  );
};
