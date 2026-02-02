import React, { useState, useRef, useEffect } from 'react';
import { Asset, useStudio } from '../../context/StudioContext';
import { ConfirmationModal } from '../ConfirmationModal/ConfirmationModal';
import { useToast } from '../../context/ToastContext';
import './AssetItem.css';

interface AssetItemProps {
  asset: Asset;
}

export const AssetItem: React.FC<AssetItemProps> = ({ asset }) => {
  const { addToast } = useToast();
  const { deleteAsset, renameAsset } = useStudio();
  const [isHovering, setIsHovering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(asset.name);
  const [showRenameWarning, setShowRenameWarning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Audio Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Font Loading
  useEffect(() => {
    if (asset.type === 'font') {
      const fontName = `font-${asset.id}`;
      const font = new FontFace(fontName, `url(${asset.url})`);

      const loadPromise = font.load();

      loadPromise.then((loadedFont) => {
        document.fonts.add(loadedFont);
      }).catch(err => {
        console.error('Failed to load font:', err);
      });

      return () => {
        loadPromise.then((loadedFont) => {
          document.fonts.delete(loadedFont);
        }).catch(() => {});
      };
    }
  }, [asset]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    deleteAsset(asset.id);
    setShowDeleteConfirm(false);
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(asset.name);
  };

  const handleRenameSubmit = () => {
    if (!editName || editName === asset.name) {
      setIsEditing(false);
      setEditName(asset.name);
      return;
    }
    setIsEditing(false);
    setShowRenameWarning(true);
  };

  const handleConfirmRename = async () => {
    try {
      await renameAsset(asset.id, editName);
      setShowRenameWarning(false);
    } catch (e) {
      addToast('Failed to rename asset', 'error');
      setEditName(asset.name);
      setShowRenameWarning(false);
    }
  };

  const handleCancelRename = () => {
    setShowRenameWarning(false);
    setEditName(asset.name);
  };

  const handleVideoEnter = () => {
    setIsHovering(true);
    if (videoRef.current) {
        videoRef.current.play().catch(() => {
            // Ignore auto-play errors
        });
    }
  };

  const handleVideoLeave = () => {
    setIsHovering(false);
    if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
    }
  };

  const toggleAudio = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPlaying && audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
      } else {
          if (!audioRef.current) {
              audioRef.current = new Audio(asset.url);
              audioRef.current.onended = () => setIsPlaying(false);
          }
          audioRef.current.play().catch(console.error);
          setIsPlaying(true);
      }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/helios-asset', JSON.stringify(asset));
    e.dataTransfer.setData('text/plain', asset.url);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const renderPreview = () => {
    switch (asset.type) {
        case 'image':
            return <img src={asset.url} alt={asset.name} />;
        case 'video':
            return (
                <video
                    ref={videoRef}
                    src={asset.url}
                    muted
                    loop
                    playsInline
                    style={{ pointerEvents: 'none' }}
                />
            );
        case 'audio':
            return (
                <div
                    className={`audio-preview ${isPlaying ? 'playing' : ''}`}
                    onClick={toggleAudio}
                    title="Click to Play/Pause"
                >
                    {isPlaying ? '🔊' : '🎵'}
                </div>
            );
        case 'font':
            return (
                <div className="font-preview" style={{ fontFamily: `font-${asset.id}, sans-serif` }}>
                    Aa
                </div>
            );
        case 'model':
            return <div style={{ color: '#aaa', fontSize: '24px' }} title="3D Model">📦</div>;
        case 'json':
            return <div style={{ color: '#aaa', fontSize: '24px' }} title="JSON Data">{`{}`}</div>;
        case 'shader':
            return <div style={{ color: '#aaa', fontSize: '24px' }} title="Shader">⚡</div>;
        default:
             return <div style={{ color: '#666', fontSize: '24px' }}>📄</div>;
    }
  };

  return (
    <>
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Asset"
        message={`Are you sure you want to delete "${asset.name}"? This action cannot be undone and may break compositions referencing this file.`}
        confirmLabel="Delete"
        isDestructive
      />
      <ConfirmationModal
        isOpen={showRenameWarning}
        onClose={handleCancelRename}
        onConfirm={handleConfirmRename}
        title="Rename Asset"
        message="Renaming this asset will change its file path. Any compositions referencing it will need to be updated manually. Are you sure you want to proceed?"
        confirmLabel="Rename"
        cancelLabel="Cancel"
      />
      <div
        className="asset-item"
      title={asset.relativePath}
      draggable={true}
      onDragStart={handleDragStart}
      onMouseEnter={asset.type === 'video' ? handleVideoEnter : () => setIsHovering(true)}
      onMouseLeave={asset.type === 'video' ? handleVideoLeave : () => setIsHovering(false)}
    >
      {isHovering && !isEditing && (
        <>
          <div
            className="delete-btn"
            onClick={handleDelete}
            title="Delete Asset"
          >
            ×
          </div>
          <div
            className="rename-btn"
            onClick={handleRenameClick}
            title="Rename Asset"
            style={{
              position: 'absolute',
              top: '4px',
              right: '28px',
              width: '20px',
              height: '20px',
              background: 'rgba(0, 0, 0, 0.7)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            ✎
          </div>
        </>
      )}
      <div className="asset-preview">
        {renderPreview()}
      </div>
      {isEditing ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit();
            if (e.key === 'Escape') {
              setIsEditing(false);
              setEditName(asset.name);
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
        <span className="asset-name">
          {asset.name}
        </span>
      )}
      </div>
    </>
  );
};
