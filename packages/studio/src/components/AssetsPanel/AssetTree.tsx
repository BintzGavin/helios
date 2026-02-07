import React, { useState, useEffect } from 'react';
import { TreeNode } from '../../utils/tree';
import { Asset } from '../../context/StudioContext';
import { AssetItem } from './AssetItem';
import './AssetTree.css';

interface AssetTreeProps {
  nodes: TreeNode<Asset>[];
  onUpload: (files: FileList, folder: string) => void;
}

export const AssetTree: React.FC<AssetTreeProps> = ({ nodes, onUpload }) => {
  const folders = nodes.filter(n => n.type === 'folder');
  const items = nodes.filter(n => n.type !== 'folder'); // 'file' or 'item'

  return (
    <div className="asset-tree">
      {folders.map(node => (
        <AssetFolder key={node.id} node={node} onUpload={onUpload} />
      ))}

      {items.length > 0 && (
        <div className="assets-grid">
          {items.map(node => (
            node.data && <AssetItem key={node.data.id} asset={node.data} />
          ))}
        </div>
      )}
    </div>
  );
};

interface AssetFolderProps {
  node: TreeNode<Asset>;
  onUpload: (files: FileList, folder: string) => void;
}

const AssetFolder: React.FC<AssetFolderProps> = ({ node, onUpload }) => {
  const [isExpanded, setIsExpanded] = useState(node.isExpanded ?? false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (node.isExpanded !== undefined) {
      setIsExpanded(node.isExpanded);
    }
  }, [node.isExpanded]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files, node.id);
      setIsExpanded(true);
    }
  };

  const children = node.children || [];
  const folders = children.filter(n => n.type === 'folder');
  const items = children.filter(n => n.type !== 'folder');

  return (
    <div className="asset-folder">
      <div
        className={`asset-folder-header ${isDragOver ? 'drag-over' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
        <span className="folder-label">{node.label}</span>
      </div>

      {isExpanded && (
        <div className="asset-folder-body">
          {folders.map(child => (
            <AssetFolder key={child.id} node={child} onUpload={onUpload} />
          ))}

          {items.length > 0 && (
            <div className="assets-grid">
              {items.map(child => (
                child.data && <AssetItem key={child.data.id} asset={child.data} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
