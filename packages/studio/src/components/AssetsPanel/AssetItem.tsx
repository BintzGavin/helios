import React from 'react';
import { Asset } from '../../context/StudioContext';

interface AssetItemProps {
  asset: Asset;
}

export const AssetItem: React.FC<AssetItemProps> = ({ asset }) => {
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
        overflow: 'hidden'
      }}
      title={asset.name}
    >
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
