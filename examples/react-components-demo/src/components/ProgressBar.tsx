import React from 'react';
import { useVideoFrame } from './useVideoFrame';
import { Helios } from '@helios-project/core';

interface ProgressBarProps {
  helios?: Helios;
  style?: React.CSSProperties;
  color?: string;
  height?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  helios: propHelios,
  style,
  color = '#fff',
  height = '4px'
}) => {
  const heliosInstance = propHelios || (typeof window !== 'undefined' ? (window as any).helios : null);
  const frame = useVideoFrame(heliosInstance);

  if (!heliosInstance) return null;

  // Access duration and fps via signal values
  const duration = heliosInstance.duration.value || 1;
  const fps = heliosInstance.fps.value || 30;
  const totalFrames = duration * fps;

  const progress = Math.min(Math.max(frame / totalFrames, 0), 1);

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'rgba(255,255,255,0.2)',
      height,
      borderRadius: '2px',
      overflow: 'hidden',
      ...style
    }}>
      <div style={{
        width: `${progress * 100}%`,
        height: '100%',
        backgroundColor: color,
      }} />
    </div>
  );
};
