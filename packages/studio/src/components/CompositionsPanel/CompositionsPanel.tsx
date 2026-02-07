import React, { useState, useMemo } from 'react';
import { useStudio, Composition } from '../../context/StudioContext';
import { ConfirmationModal } from '../ConfirmationModal/ConfirmationModal';
import { buildTree } from '../../utils/tree';
import { CompositionTree } from './CompositionTree';
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

  // Build tree structure
  const treeNodes = useMemo(() => {
    return buildTree<Composition>(compositions, (c) => c.id, searchQuery, 'composition');
  }, [compositions, searchQuery]);

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

  const handleSelect = (comp: Composition) => {
    setActiveComposition(comp);
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
        {treeNodes.length === 0 ? (
          <div className="compositions-empty">
            {compositions.length === 0 ? 'No compositions yet.' : 'No matches found.'}
          </div>
        ) : (
          <CompositionTree
            nodes={treeNodes}
            activeCompositionId={activeComposition?.id}
            onSelect={handleSelect}
            onDuplicate={handleDuplicate}
            onDelete={handleDeleteClick}
          />
        )}
      </div>
    </div>
  );
};
