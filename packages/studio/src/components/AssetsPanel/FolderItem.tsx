import React, { useState } from 'react';
import { Asset, useStudio } from '../../context/StudioContext';
import { ConfirmationModal } from '../ConfirmationModal/ConfirmationModal';
import { useToast } from '../../context/ToastContext';
import './FolderItem.css';

interface FolderItemProps {
  name: string;
  asset?: Asset;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
}

export const FolderItem: React.FC<FolderItemProps> = ({ name, asset, onClick, onDrop }) => {
  const { addToast } = useToast();
  const { deleteAsset, renameAsset, moveAsset } = useStudio();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [showRenameWarning, setShowRenameWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const assetId = e.dataTransfer.getData('application/helios-asset-id');
    if (assetId && asset) {
       try {
         await moveAsset(assetId, asset.id);
       } catch (err) {
         // handled by toast in moveAsset
       }
    } else {
       onDrop(e);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!asset) return;
    try {
        await deleteAsset(asset.id);
        setShowDeleteConfirm(false);
    } catch (e) {
        addToast('Failed to delete folder', 'error');
    }
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(name);
  };

  const handleRenameSubmit = () => {
    if (!editName || editName === name) {
      setIsEditing(false);
      setEditName(name);
      return;
    }
    setIsEditing(false);
    setShowRenameWarning(true);
  };

  const handleConfirmRename = async () => {
    if (!asset) return;
    try {
      await renameAsset(asset.id, editName);
      setShowRenameWarning(false);
    } catch (e) {
      addToast('Failed to rename folder', 'error');
      setEditName(name);
      setShowRenameWarning(false);
    }
  };

  const handleCancelRename = () => {
    setShowRenameWarning(false);
    setEditName(name);
  };

  return (
    <>
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Folder"
        message={`Are you sure you want to delete folder "${name}"? This will delete all files inside it.`}
        confirmLabel="Delete"
        isDestructive
      />
      <ConfirmationModal
        isOpen={showRenameWarning}
        onClose={handleCancelRename}
        onConfirm={handleConfirmRename}
        title="Rename Folder"
        message="Renaming this folder will change file paths for all contents. Compositions referencing these files may break. Are you sure?"
        confirmLabel="Rename"
        cancelLabel="Cancel"
      />
      <div
        className={`folder-item ${isDragOver ? 'drag-over' : ''}`}
        onClick={onClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        title={name}
      >
        <div className="folder-icon">📁</div>
        {isEditing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditName(name);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              style={{
                width: '100%',
                fontSize: '0.8em',
                textAlign: 'center',
                background: '#444',
                border: 'none',
                color: '#fff',
                padding: '2px',
                borderRadius: '2px',
                outline: 'none'
              }}
            />
        ) : (
            <span className="folder-name">{name}</span>
        )}

        {isHovering && !isEditing && asset && (
            <>
               <div className="rename-btn" onClick={handleRenameClick} title="Rename">✎</div>
               <div className="delete-btn" onClick={handleDelete} title="Delete">×</div>
            </>
        )}
      </div>
    </>
  );
};
