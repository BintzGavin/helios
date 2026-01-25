import React from 'react';
import { useStudio } from '../../context/StudioContext';
import { AssetItem } from './AssetItem';

export const AssetsPanel: React.FC = () => {
  const { assets } = useStudio();

  if (assets.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#666', fontSize: '0.9em', textAlign: 'center' }}>
        No assets found.
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      padding: '8px',
      overflowY: 'auto',
      height: '100%'
    }}>
      {assets.map((asset) => (
        <AssetItem key={asset.id} asset={asset} />
      ))}
    </div>
  );
};
