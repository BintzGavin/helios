import React, { useState, useRef } from 'react';
import { useStudio } from '../../context/StudioContext';
import { AssetItem } from './AssetItem';

export const AssetsPanel: React.FC = () => {
  const { assets, uploadAsset } = useStudio();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       for (let i = 0; i < e.dataTransfer.files.length; i++) {
           await uploadAsset(e.dataTransfer.files[i]);
       }
    }
  };

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          for (let i = 0; i < e.target.files.length; i++) {
              await uploadAsset(e.target.files[i]);
          }
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
        style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
        {isDragging && (
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(50, 150, 255, 0.2)',
                border: '2px dashed #3296ff',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                pointerEvents: 'none'
            }}>
                Drop files to upload
            </div>
        )}

      <div style={{ padding: '8px', borderBottom: '1px solid #333' }}>
         <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            multiple
         />
         <button
            onClick={handleUploadClick}
            style={{
                width: '100%',
                padding: '6px',
                background: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
            }}
         >
            Upload Asset
         </button>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        padding: '8px',
        overflowY: 'auto'
      }}>
        {assets.length === 0 ? (
             <div style={{ color: '#666', fontSize: '0.9em', width: '100%', textAlign: 'center', marginTop: '20px' }}>
                No assets found.<br/>Drag & drop to upload.
             </div>
        ) : (
            assets.map((asset) => (
                <AssetItem key={asset.id} asset={asset} />
            ))
        )}
      </div>
    </div>
  );
};
