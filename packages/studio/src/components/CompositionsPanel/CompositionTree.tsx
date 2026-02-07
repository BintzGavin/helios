import React, { useState, useEffect } from 'react';
import { TreeNode } from '../../utils/tree';
import { Composition } from '../../context/StudioContext';
import { CompositionItem } from './CompositionItem';
import './CompositionTree.css';

interface CompositionTreeProps {
  nodes: TreeNode<Composition>[];
  activeCompositionId: string | undefined;
  onSelect: (comp: Composition) => void;
  onDuplicate: (e: React.MouseEvent, comp: Composition) => void;
  onDelete: (e: React.MouseEvent, comp: Composition) => void;
}

export const CompositionTree: React.FC<CompositionTreeProps> = ({
  nodes,
  activeCompositionId,
  onSelect,
  onDuplicate,
  onDelete
}) => {
  // Split root nodes
  const folders = nodes.filter(n => n.type === 'folder');
  const comps = nodes.filter(n => n.type === 'composition');

  return (
    <div className="composition-tree">
      {folders.map(node => (
        <CompositionFolder
          key={node.id}
          node={node}
          activeCompositionId={activeCompositionId}
          onSelect={onSelect}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}

      {comps.length > 0 && (
        <div className="compositions-grid">
          {comps.map(node => (
             node.data && (
                <CompositionItem
                    key={node.id}
                    composition={node.data}
                    isActive={activeCompositionId === node.data.id}
                    onSelect={onSelect}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                />
             )
          ))}
        </div>
      )}
    </div>
  );
};

interface CompositionFolderProps {
  node: TreeNode<Composition>;
  activeCompositionId: string | undefined;
  onSelect: (comp: Composition) => void;
  onDuplicate: (e: React.MouseEvent, comp: Composition) => void;
  onDelete: (e: React.MouseEvent, comp: Composition) => void;
}

const CompositionFolder: React.FC<CompositionFolderProps> = ({
  node,
  activeCompositionId,
  onSelect,
  onDuplicate,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(node.isExpanded ?? false);

  useEffect(() => {
    if (node.isExpanded !== undefined) {
      setIsExpanded(node.isExpanded);
    }
  }, [node.isExpanded]);

  const children = node.children || [];
  const folders = children.filter(n => n.type === 'folder');
  const comps = children.filter(n => n.type === 'composition');

  return (
    <div className="composition-folder">
      <div className="composition-folder-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
        <span className="folder-label">{node.label}</span>
      </div>

      {isExpanded && (
        <div className="composition-folder-body">
          {folders.map(child => (
            <CompositionFolder
              key={child.id}
              node={child}
              activeCompositionId={activeCompositionId}
              onSelect={onSelect}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}

          {comps.length > 0 && (
            <div className="compositions-grid">
              {comps.map(child => (
                child.data && (
                   <CompositionItem
                       key={child.id}
                       composition={child.data}
                       isActive={activeCompositionId === child.data.id}
                       onSelect={onSelect}
                       onDuplicate={onDuplicate}
                       onDelete={onDelete}
                   />
                )
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
