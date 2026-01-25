import React from 'react';
import { useStudio } from '../context/StudioContext';

export const Timeline: React.FC = () => {
  const { controller, playerState } = useStudio();
  const { currentFrame, duration, fps } = playerState;
  const totalFrames = duration * fps;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!controller) return;
    const frame = parseInt(e.target.value, 10);
    controller.seek(frame);
  };

  const formatTime = (frame: number, fps: number) => {
    const totalSeconds = frame / fps;
    const mins = Math.floor(totalSeconds / 60);
    const secs = (totalSeconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'monospace' }}>
          {formatTime(currentFrame, fps)} / {formatTime(totalFrames, fps)}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '0.8em', color: '#666' }}>
          Frame: {Math.round(currentFrame)}
        </div>
      </div>
      <input
        type="range"
        min="0"
        max={totalFrames}
        value={currentFrame}
        onChange={handleSeek}
        disabled={!controller}
        style={{ width: '100%', cursor: controller ? 'pointer' : 'not-allowed' }}
      />
    </div>
  );
};
