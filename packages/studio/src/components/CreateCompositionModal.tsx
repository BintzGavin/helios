import React, { useState, useEffect, useRef } from 'react';
import { useStudio } from '../context/StudioContext';
import './CreateCompositionModal.css';

export const CreateCompositionModal: React.FC = () => {
  const { isCreateOpen, setCreateOpen, createComposition } = useStudio();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreateOpen) {
      setName('');
      setError(null);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isCreateOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await createComposition(name);
      // Modal closes automatically via context update in createComposition
    } catch (err: any) {
      setError(err.message || 'Failed to create composition');
      setLoading(false);
    }
  };

  if (!isCreateOpen) return null;

  return (
    <div className="create-modal-overlay" onClick={() => setCreateOpen(false)}>
      <div className="create-modal-content" onClick={e => e.stopPropagation()}>
        <div className="create-modal-header">New Composition</div>

        <form onSubmit={handleSubmit}>
          <div className="create-modal-input-group">
            <label>Composition Name</label>
            <input
              ref={inputRef}
              className="create-modal-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Amazing Video"
              disabled={loading}
            />
          </div>

          {error && <div className="create-modal-error">{error}</div>}

          <div className="create-modal-actions">
            <button
              type="button"
              className="create-modal-button cancel"
              onClick={() => setCreateOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-modal-button create"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
