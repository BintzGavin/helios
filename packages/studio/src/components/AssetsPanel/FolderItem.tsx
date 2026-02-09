import React, { useState } from 'react';
import './FolderItem.css';

interface FolderItemProps {
  name: string;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({ name, onClick, onDrop }) => {
  const [isDragOver, setIsDragOver] = useState(false);

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
    onDrop(e);
  };

  return (
    <div
      className={`folder-item ${isDragOver ? 'drag-over' : ''}`}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title={name}
    >
      <div className="folder-icon">📁</div>
      <span className="folder-name">{name}</span>
    </div>
  );
};
