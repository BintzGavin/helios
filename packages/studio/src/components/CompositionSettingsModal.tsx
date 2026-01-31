import React, { useState, useEffect } from 'react';
import { useStudio } from '../context/StudioContext';
import './CompositionSettingsModal.css';

export const CompositionSettingsModal: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen, updateCompositionMetadata, activeComposition, setDuplicateOpen } = useStudio();
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [fps, setFps] = useState(30);
  const [duration, setDuration] = useState(5);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isSettingsOpen && activeComposition) {
      if (activeComposition.metadata) {
        setWidth(activeComposition.metadata.width);
        setHeight(activeComposition.metadata.height);
        setFps(activeComposition.metadata.fps);
        setDuration(activeComposition.metadata.duration);
      }
      setError(null);
      setLoading(false);
    }
  }, [isSettingsOpen, activeComposition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComposition) return;

    setLoading(true);
    setError(null);

    try {
      await updateCompositionMetadata(activeComposition.id, { width, height, fps, duration });
      setSettingsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
      setLoading(false);
    }
  };

  if (!isSettingsOpen || !activeComposition) return null;

  return (
    <div className="settings-modal-overlay" onClick={() => setSettingsOpen(false)}>
      <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
        <div className="settings-modal-header">Composition Settings</div>

        <form onSubmit={handleSubmit}>
          <div className="settings-modal-row">
            <div className="settings-modal-input-group">
              <label>Width</label>
              <input
                type="number"
                className="settings-modal-input"
                value={width}
                onChange={e => setWidth(Number(e.target.value))}
                disabled={loading}
              />
            </div>
            <div className="settings-modal-input-group">
              <label>Height</label>
              <input
                type="number"
                className="settings-modal-input"
                value={height}
                onChange={e => setHeight(Number(e.target.value))}
                disabled={loading}
              />
            </div>
          </div>

          <div className="settings-modal-row">
            <div className="settings-modal-input-group">
              <label>FPS</label>
              <input
                type="number"
                className="settings-modal-input"
                value={fps}
                onChange={e => setFps(Number(e.target.value))}
                disabled={loading}
              />
            </div>
            <div className="settings-modal-input-group">
              <label>Duration (sec)</label>
              <input
                type="number"
                className="settings-modal-input"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                disabled={loading}
              />
            </div>
          </div>

          {error && <div className="settings-modal-error">{error}</div>}

          <div className="settings-modal-actions">
            <button
              type="button"
              className="settings-modal-button cancel"
              onClick={() => {
                setSettingsOpen(false);
                setDuplicateOpen(true);
              }}
              disabled={loading}
              style={{ marginRight: 'auto' }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="settings-modal-button cancel"
              onClick={() => setSettingsOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="settings-modal-button save"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
