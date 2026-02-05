import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useStudio } from '../../context/StudioContext';
import { AudioAsset } from '../../types';
import './AudioMixerPanel.css';
import { AudioMeter, AudioMeterRef, AudioLevels } from './AudioMeter';

export const AudioMixerPanel: React.FC = () => {
  const { controller } = useStudio();
  const [tracks, setTracks] = useState<AudioAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [soloTrackId, setSoloTrackId] = useState<string | null>(null);
  const [muteSnapshot, setMuteSnapshot] = useState<Record<string, boolean>>({});

  const meterRef = useRef<AudioMeterRef>(null);

  const fetchTracks = useCallback(async () => {
    if (!controller) return;
    setIsLoading(true);
    try {
      const assets = await controller.getAudioTracks();
      setTracks(assets);
    } catch (e) {
      console.error("Failed to fetch audio tracks", e);
    } finally {
      setIsLoading(false);
    }
  }, [controller]);

  useEffect(() => {
    if (controller) {
      fetchTracks();
    }
  }, [controller, fetchTracks]);

  // Audio Metering Lifecycle
  useEffect(() => {
    if (!controller) return;

    // Start metering
    controller.startAudioMetering();

    // Subscribe to updates
    const unsubscribe = controller.onAudioMetering((levels: any) => {
        if (meterRef.current) {
            meterRef.current.update(levels as AudioLevels);
        }
    });

    return () => {
        controller.stopAudioMetering();
        unsubscribe();
    };
  }, [controller]);

  const handleVolumeChange = (id: string, newVolume: number) => {
    if (!controller) return;
    controller.setAudioTrackVolume(id, newVolume);

    // Optimistic update
    setTracks(prev => prev.map(t =>
      t.id === id ? { ...t, volume: newVolume } : t
    ));
  };

  const handleMuteToggle = (id: string) => {
    if (!controller) return;

    // Find current track to toggle
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    const newMuted = !track.muted;
    controller.setAudioTrackMuted(id, newMuted);

    // Optimistic update
    setTracks(prev => prev.map(t =>
      t.id === id ? { ...t, muted: newMuted } : t
    ));
  };

  const handleSoloToggle = (id: string) => {
    if (!controller) return;

    if (soloTrackId === id) {
      // Deactivate Solo
      setSoloTrackId(null);

      // Restore mutes from snapshot
      const newTracks = tracks.map(t => {
        const originalMuted = muteSnapshot[t.id] ?? t.muted;
        if (t.muted !== originalMuted) {
          controller.setAudioTrackMuted(t.id, originalMuted);
        }
        return { ...t, muted: originalMuted };
      });

      setTracks(newTracks);
      setMuteSnapshot({});
    } else {
      // Activate Solo (or switch target)
      let snapshot = muteSnapshot;

      // If starting fresh solo session, capture snapshot
      if (soloTrackId === null) {
        snapshot = {};
        tracks.forEach(t => {
          snapshot[t.id] = !!t.muted;
        });
        setMuteSnapshot(snapshot);
      }

      setSoloTrackId(id);

      // Mute all others, Unmute target
      const newTracks = tracks.map(t => {
        const shouldBeMuted = t.id !== id;

        // Only call controller if state changes
        if (!!t.muted !== shouldBeMuted) {
          controller.setAudioTrackMuted(t.id, shouldBeMuted);
        }

        return { ...t, muted: shouldBeMuted };
      });

      setTracks(newTracks);
    }
  };

  return (
    <div className="audio-mixer-panel">
      <div className="mixer-header">
        <h3>
          Audio Mixer
          <AudioMeter ref={meterRef} />
        </h3>
        <button
          className="mixer-refresh-btn"
          onClick={fetchTracks}
          title="Refresh Tracks"
          disabled={isLoading}
        >
          {isLoading ? '...' : '↻'}
        </button>
      </div>

      <div className="mixer-track-list">
        {tracks.length === 0 ? (
          <div className="mixer-empty-state">
            {controller ? "No audio tracks found." : "Connect to player..."}
          </div>
        ) : (
          tracks.map(track => {
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
                    className={`track-solo-btn ${soloTrackId === track.id ? 'active' : ''}`}
                    onClick={() => handleSoloToggle(track.id)}
                    title="Solo"
                  >
                    S
                  </button>

                  <button
                    className={`track-mute-btn ${isMuted ? 'active' : ''}`}
                    onClick={() => handleMuteToggle(track.id)}
                    title={isMuted ? "Unmute" : "Mute"}
                    disabled={soloTrackId !== null && soloTrackId !== track.id}
                    style={{ opacity: (soloTrackId !== null && soloTrackId !== track.id) ? 0.5 : 1 }}
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
