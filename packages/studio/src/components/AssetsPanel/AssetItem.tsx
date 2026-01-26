import React, { useState } from 'react';
import { Asset, useStudio } from '../../context/StudioContext';

interface AssetItemProps {
  asset: Asset;
}

export const AssetItem: React.FC<AssetItemProps> = ({ asset }) => {
  const { deleteAsset } = useStudio();
  const [isHovering, setIsHovering] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${asset.name}?`)) {
      deleteAsset(asset.id);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px',
        border: '1px solid #333',
        borderRadius: '4px',
        cursor: 'pointer',
        background: '#222',
        gap: '4px',
        width: '100px',
        overflow: 'hidden',
        position: 'relative'
      }}
      title={asset.name}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {isHovering && (
        <div
            onClick={handleDelete}
            style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '20px',
                height: '20px',
                background: 'rgba(0,0,0,0.7)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff4444',
                fontSize: '14px',
                cursor: 'pointer',
                zIndex: 10
            }}
            title="Delete Asset"
        >
            ×
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: '60px',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: '2px'
        }}
      >
        {asset.type === 'image' ? (
          <img
            src={asset.url}
            alt={asset.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
            <div style={{ color: '#666', fontSize: '24px' }}>
                {asset.type === 'audio' ? '🎵' : '📄'}
            </div>
        )}
      </div>
      <span
        style={{
          fontSize: '0.8em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
          textAlign: 'center',
          color: '#ccc'
        }}
      >
        {asset.name}
      </span>
    </div>
  );
};
