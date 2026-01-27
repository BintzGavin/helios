import React from 'react';
import { useStudio } from '../../context/StudioContext';

export const PlaybackControls: React.FC = () => {
  const { controller, playerState, loop, toggleLoop } = useStudio();
  const { isPlaying, currentFrame, duration, fps, playbackRate, volume, muted } = playerState;
  const totalFrames = duration * fps;

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rate = parseFloat(e.target.value);
    if (controller) {
      controller.setPlaybackRate(rate);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (controller) {
      controller.setAudioVolume(newVolume);
    }
  };

  const handleMuteToggle = () => {
    if (controller) {
      controller.setAudioMuted(!muted);
    }
  };

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

  const handlePrevFrame = () => {
    if (controller) {
      controller.seek(Math.max(0, currentFrame - 1));
    }
  };

  const handleNextFrame = () => {
    if (controller) {
      controller.seek(currentFrame + 1);
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
        onClick={handlePrevFrame}
        disabled={!controller}
        title="Previous Frame (Left Arrow)"
        style={{
           cursor: controller ? 'pointer' : 'not-allowed',
           padding: '4px 8px',
           background: 'none',
           border: '1px solid #444',
           borderRadius: '4px',
           color: 'white'
        }}
      >
        {'<'}
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
        onClick={handleNextFrame}
        disabled={!controller}
        title="Next Frame (Right Arrow)"
        style={{
           cursor: controller ? 'pointer' : 'not-allowed',
           padding: '4px 8px',
           background: 'none',
           border: '1px solid #444',
           borderRadius: '4px',
           color: 'white'
        }}
      >
        {'>'}
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

      <div style={{ height: '24px', width: '1px', background: '#444', margin: '0 4px' }} />

      <button
        onClick={handleMuteToggle}
        disabled={!controller}
        title={muted ? "Unmute" : "Mute"}
        style={{
          cursor: controller ? 'pointer' : 'not-allowed',
          padding: '4px 8px',
          background: 'none',
          border: '1px solid #444',
          borderRadius: '4px',
          color: 'white',
          minWidth: '32px'
        }}
      >
        {muted || volume === 0 ? '🔇' : '🔊'}
      </button>

      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={handleVolumeChange}
        disabled={!controller}
        style={{
          width: '60px',
          cursor: controller ? 'pointer' : 'not-allowed'
        }}
        title={`Volume: ${Math.round(volume * 100)}%`}
      />

      <div style={{ height: '24px', width: '1px', background: '#444', margin: '0 4px' }} />

      <select
        value={playbackRate}
        onChange={handleSpeedChange}
        disabled={!controller}
        title="Playback Speed"
        style={{
          cursor: controller ? 'pointer' : 'not-allowed',
          padding: '4px 4px',
          background: '#222',
          border: '1px solid #444',
          borderRadius: '4px',
          color: 'white',
          fontSize: '12px',
          outline: 'none'
        }}
      >
        <option value="-1">⏪ -1x</option>
        <option value="0.25">0.25x</option>
        <option value="0.5">0.5x</option>
        <option value="1">1x</option>
        <option value="2">2x</option>
        <option value="4">4x</option>
      </select>
    </div>
  );
};
