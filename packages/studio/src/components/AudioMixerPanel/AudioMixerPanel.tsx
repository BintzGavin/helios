import React from 'react';
import { useStudio } from '../../context/StudioContext';
import './AudioMixerPanel.css';

export const AudioMixerPanel: React.FC = () => {
  const { controller, audioAssets, refreshAudioAssets } = useStudio();

  const handleVolumeChange = async (id: string, newVolume: number) => {
    if (!controller) return;
    controller.setAudioTrackVolume(id, newVolume);
    await refreshAudioAssets();
  };

  const handleMuteToggle = async (id: string) => {
    if (!controller) return;
    // Find current track to toggle
    const track = audioAssets.find(t => t.id === id);
    if (!track) return;

    const newMuted = !track.muted;
    controller.setAudioTrackMuted(id, newMuted);
    await refreshAudioAssets();
  };

  return (
    <div className="audio-mixer-panel">
      <div className="mixer-header">
        <h3>Audio Mixer</h3>
        <button
          className="mixer-refresh-btn"
          onClick={refreshAudioAssets}
          title="Refresh Tracks"
        >
          ↻
        </button>
      </div>

      <div className="mixer-track-list">
        {audioAssets.length === 0 ? (
          <div className="mixer-empty-state">
            {controller ? "No audio tracks found." : "Connect to player..."}
          </div>
        ) : (
          audioAssets.map(track => {
            // Default volume to 1 if undefined, muted to false
            const volume = track.volume ?? 1;
            const isMuted = !!track.muted;

            return (
              <div key={track.id} className="mixer-track">
                <div className="track-header">
                  <span className="track-name" title={track.id}>{track.id}</span>
                  <div className="track-volume-value">{Math.round(volume * 100)}%</div>
                </div>

                <div className="track-controls">
                  <button
                    className={`track-mute-btn ${isMuted ? 'active' : ''}`}
                    onClick={() => handleMuteToggle(track.id)}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>

                  <input
                    type="range"
                    className="track-volume-slider"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
