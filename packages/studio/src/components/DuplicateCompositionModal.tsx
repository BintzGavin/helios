import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '../context/StudioContext';
import './DuplicateCompositionModal.css';

export const DuplicateCompositionModal: React.FC = () => {
  const { isDuplicateOpen, setDuplicateOpen, duplicateComposition, activeComposition } = useStudio();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDuplicateOpen && activeComposition) {
      setName(`Copy of ${activeComposition.name}`);
      setError(null);
      setLoading(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 10);
    }
  }, [isDuplicateOpen, activeComposition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeComposition) return;

    setLoading(true);
    setError(null);

    try {
      await duplicateComposition(activeComposition.id, name);
      // Modal closes automatically via context
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate composition');
      setLoading(false);
    }
  };

  if (!isDuplicateOpen) return null;

  return (
    <div className="duplicate-modal-overlay" onClick={() => setDuplicateOpen(false)}>
      <div className="duplicate-modal-content" onClick={e => e.stopPropagation()}>
        <div className="duplicate-modal-header">Duplicate Composition</div>

        <form onSubmit={handleSubmit}>
          <div className="duplicate-modal-input-group">
            <label>New Name</label>
            <input
              ref={inputRef}
              className="duplicate-modal-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Video V2"
              disabled={loading}
            />
          </div>

          {error && <div className="duplicate-modal-error">{error}</div>}

          <div className="duplicate-modal-actions">
            <button
              type="button"
              className="duplicate-modal-button cancel"
              onClick={() => setDuplicateOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="duplicate-modal-button duplicate"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Duplicating...' : 'Duplicate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
