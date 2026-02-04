import { ComponentDefinition } from './types.js';

const TIMER_CODE = `import React from 'react';
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

  const fps = heliosInstance.config.fps || 30;
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
`;

const USE_VIDEO_FRAME_CODE = `import { useState, useEffect } from 'react';
import { Helios } from '@helios-project/core';

export function useVideoFrame(helios: Helios | undefined) {
    const [frame, setFrame] = useState(helios?.getState().currentFrame ?? 0);

    useEffect(() => {
        if (!helios) return;

        // Update local state when helios state changes
        const update = (state: any) => setFrame(state.currentFrame);

        // Subscribe returns an unsubscribe function
        return helios.subscribe(update);
    }, [helios]);

    return frame;
}
`;

export const registry: ComponentDefinition[] = [
  {
    name: 'timer',
    type: 'react',
    files: [
      {
        name: 'Timer.tsx',
        content: TIMER_CODE,
      },
      {
        name: 'useVideoFrame.ts',
        content: USE_VIDEO_FRAME_CODE,
      },
    ],
    dependencies: {
      'react': '^18.0.0',
      '@helios-project/core': 'latest'
    }
  },
];

export function findComponent(name: string): ComponentDefinition | undefined {
  return registry.find((c) => c.name === name);
}
