import React from 'react';
import { Composition } from '../../context/StudioContext';

interface CompositionItemProps {
  composition: Composition;
  isActive: boolean;
  onSelect: (comp: Composition) => void;
  onDuplicate: (e: React.MouseEvent, comp: Composition) => void;
  onDelete: (e: React.MouseEvent, comp: Composition) => void;
}

export const CompositionItem: React.FC<CompositionItemProps> = ({
  composition,
  isActive,
  onSelect,
  onDuplicate,
  onDelete
}) => {
  return (
    <div
      className={`composition-item ${isActive ? 'active' : ''}`}
      onClick={() => onSelect(composition)}
    >
      <div className="composition-thumbnail">
        {composition.thumbnailUrl ? (
          <img src={composition.thumbnailUrl} alt={composition.name} />
        ) : (
          <div className="composition-placeholder">
            <span>🎬</span>
          </div>
        )}
        <div className="composition-actions">
          <button
            className="composition-action-btn duplicate"
            onClick={(e) => onDuplicate(e, composition)}
            title="Duplicate"
          >
            📑
          </button>
          <button
            className="composition-action-btn delete"
            onClick={(e) => onDelete(e, composition)}
            title="Delete"
          >
            ×
          </button>
        </div>
      </div>
      <div className="composition-name" title={composition.name}>
        {composition.name}
      </div>
    </div>
  );
};
