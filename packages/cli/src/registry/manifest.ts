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

const PROGRESS_BAR_CODE = `import React from 'react';
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
        width: \`\${progress * 100}%\`,
        height: '100%',
        backgroundColor: color,
      }} />
    </div>
  );
};
`;

const WATERMARK_CODE = `import React from 'react';

interface WatermarkProps {
  text?: string;
  image?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity?: number;
  style?: React.CSSProperties;
}

export const Watermark: React.FC<WatermarkProps> = ({
  text = 'Helios',
  image,
  position = 'bottom-right',
  opacity = 0.5,
  style
}) => {
  const getPositionStyle = () => {
    switch(position) {
      case 'top-left': return { top: 20, left: 20 };
      case 'top-right': return { top: 20, right: 20 };
      case 'bottom-left': return { bottom: 20, left: 20 };
      case 'bottom-right': return { bottom: 20, right: 20 };
      default: return { bottom: 20, right: 20 };
    }
  };

  return (
    <div style={{
      position: 'absolute',
      ...getPositionStyle(),
      opacity,
      pointerEvents: 'none',
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      ...style
    }}>
      {image ? (
        <img src={image} alt="watermark" style={{ maxHeight: '40px' }} />
      ) : (
        <span>{text}</span>
      )}
    </div>
  );
};
`;

export const registry: ComponentDefinition[] = [
  {
    name: 'timer',
    description: 'Displays a countdown or stopwatch synchronized with the video frame.',
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
  {
    name: 'progress-bar',
    description: 'Visualizes playback progress.',
    type: 'react',
    files: [
      {
        name: 'ProgressBar.tsx',
        content: PROGRESS_BAR_CODE,
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
  {
    name: 'watermark',
    description: 'Overlay text or image logo.',
    type: 'react',
    files: [
      {
        name: 'Watermark.tsx',
        content: WATERMARK_CODE,
      },
    ],
    dependencies: {
      'react': '^18.0.0',
    }
  },
];

export function findComponent(name: string): ComponentDefinition | undefined {
  return registry.find((c) => c.name === name);
}
