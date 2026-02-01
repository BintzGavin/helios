import React, { useState } from 'react';
import { useStudio, Composition } from '../../context/StudioContext';
import { ConfirmationModal } from '../ConfirmationModal/ConfirmationModal';
import './CompositionsPanel.css';

export const CompositionsPanel: React.FC = () => {
  const {
    compositions,
    activeComposition,
    setActiveComposition,
    setCreateOpen,
    setDuplicateOpen,
    setDuplicateTargetId,
    deleteComposition
  } = useStudio();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Composition | null>(null);

  const filteredCompositions = compositions.filter(comp =>
    comp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDuplicate = (e: React.MouseEvent, comp: Composition) => {
    e.stopPropagation();
    setDuplicateTargetId(comp.id);
    setDuplicateOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, comp: Composition) => {
    e.stopPropagation();
    setDeleteTarget(comp);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await deleteComposition(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="compositions-panel">
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Composition"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
      />

      <div className="compositions-header">
        <div className="compositions-title-row">
          <span className="compositions-title">Compositions</span>
          <button
            className="compositions-new-btn"
            onClick={() => setCreateOpen(true)}
            title="New Composition"
          >
            + New
          </button>
        </div>
        <div className="compositions-search-row">
          <input
            type="text"
            className="compositions-search-input"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="compositions-list">
        {filteredCompositions.length === 0 ? (
          <div className="compositions-empty">
            {compositions.length === 0 ? 'No compositions yet.' : 'No matches found.'}
          </div>
        ) : (
          filteredCompositions.map(comp => (
            <div
              key={comp.id}
              className={`composition-item ${activeComposition?.id === comp.id ? 'active' : ''}`}
              onClick={() => setActiveComposition(comp)}
            >
              <div className="composition-thumbnail">
                {comp.thumbnailUrl ? (
                  <img src={comp.thumbnailUrl} alt={comp.name} />
                ) : (
                  <div className="composition-placeholder">
                    <span>🎬</span>
                  </div>
                )}
                <div className="composition-actions">
                  <button
                    className="composition-action-btn duplicate"
                    onClick={(e) => handleDuplicate(e, comp)}
                    title="Duplicate"
                  >
                    📑
                  </button>
                  <button
                    className="composition-action-btn delete"
                    onClick={(e) => handleDeleteClick(e, comp)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="composition-name" title={comp.name}>
                {comp.name}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
