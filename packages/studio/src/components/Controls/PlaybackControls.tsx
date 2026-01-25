import React from 'react';
import { useStudio } from '../../context/StudioContext';

export const PlaybackControls: React.FC = () => {
  const { controller, playerState, loop, toggleLoop } = useStudio();
  const { isPlaying, currentFrame, duration, fps } = playerState;
  const totalFrames = duration * fps;

  const handlePlayPause = () => {
    if (!controller) return;
    if (isPlaying) {
      controller.pause();
    } else {
      // If at end, restart
      if (currentFrame >= totalFrames - 1) {
        controller.seek(0);
      }
      controller.play();
    }
  };

  const handleRewind = () => {
    if (controller) {
      controller.seek(0);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleRewind}
        disabled={!controller}
        title="Rewind / Restart (Home)"
        style={{
           cursor: controller ? 'pointer' : 'not-allowed',
           padding: '4px 8px',
           background: 'none',
           border: '1px solid #444',
           borderRadius: '4px',
           color: 'white'
        }}
      >
        ⏮
      </button>
      <button
        onClick={handlePlayPause}
        disabled={!controller}
        title="Play / Pause (Space)"
        style={{
          cursor: controller ? 'pointer' : 'not-allowed',
          padding: '4px 12px',
          background: isPlaying ? '#444' : '#222',
          border: '1px solid #555',
          borderRadius: '4px',
          color: 'white',
          minWidth: '60px'
        }}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <button
        onClick={toggleLoop}
        title="Toggle Loop"
        style={{
          cursor: 'pointer',
          padding: '4px 8px',
          background: loop ? '#007acc' : 'none',
          border: '1px solid #444',
          borderRadius: '4px',
          color: 'white'
        }}
      >
        🔁
      </button>
    </div>
  );
};
