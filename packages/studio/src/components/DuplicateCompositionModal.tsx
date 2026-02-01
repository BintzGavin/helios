import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '../context/StudioContext';
import './DuplicateCompositionModal.css';

export const DuplicateCompositionModal: React.FC = () => {
  const {
    isDuplicateOpen,
    setDuplicateOpen,
    duplicateComposition,
    activeComposition,
    duplicateTargetId,
    setDuplicateTargetId,
    compositions
  } = useStudio();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDuplicateOpen) {
      const targetId = duplicateTargetId || activeComposition?.id;
      const targetComp = compositions.find(c => c.id === targetId);

      if (targetComp) {
        setName(`Copy of ${targetComp.name}`);
        setError(null);
        setLoading(false);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 10);
      }
    }
  }, [isDuplicateOpen, activeComposition, duplicateTargetId, compositions]);

  const handleClose = () => {
    setDuplicateOpen(false);
    setDuplicateTargetId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = duplicateTargetId || activeComposition?.id;
    if (!name.trim() || !targetId) return;

    setLoading(true);
    setError(null);

    try {
      await duplicateComposition(targetId, name);
      setDuplicateTargetId(null);
      // Modal closes automatically via context (duplicateComposition sets isDuplicateOpen false)
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate composition');
      setLoading(false);
    }
  };

  if (!isDuplicateOpen) return null;

  return (
    <div className="duplicate-modal-overlay" onClick={handleClose}>
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
              onClick={handleClose}
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
