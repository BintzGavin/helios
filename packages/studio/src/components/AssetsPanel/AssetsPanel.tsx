import React, { useState, useRef, useMemo } from 'react';
import { useStudio, Asset } from '../../context/StudioContext';
import { buildTree } from '../../utils/tree';
import { AssetTree } from './AssetTree';
import './AssetsPanel.css';

export const AssetsPanel: React.FC = () => {
  const { assets, uploadAsset } = useStudio();
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<Asset['type'] | 'all'>('all');
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

  const handleTreeUpload = async (files: FileList, folder: string) => {
      for (let i = 0; i < files.length; i++) {
          await uploadAsset(files[i], folder);
      }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
        return filterType === 'all' || asset.type === filterType;
    });
  }, [assets, filterType]);

  const treeNodes = useMemo(() => {
    return buildTree<Asset>(filteredAssets, a => a.relativePath || a.name, searchQuery, 'file');
  }, [filteredAssets, searchQuery]);

  return (
    <div
        className="assets-panel"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
        {isDragging && (
            <div className="assets-drop-overlay">
                Drop files to upload
            </div>
        )}

      <div className="assets-header">
         <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            multiple
         />
         <button
            className="assets-upload-btn"
            onClick={handleUploadClick}
         >
            Upload Asset
         </button>

         <div className="assets-toolbar">
            <input
                type="text"
                className="assets-search-input"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
            <select
                className="assets-filter-select"
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
            >
                <option value="all">All</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
                <option value="font">Font</option>
                <option value="model">Model</option>
                <option value="json">JSON</option>
                <option value="shader">Shader</option>
                <option value="other">Other</option>
            </select>
         </div>
      </div>

      <div className="assets-list">
        {treeNodes.length === 0 ? (
             <div className="assets-empty">
                {assets.length === 0 ? (
                    <>No assets found.<br/>Drag & drop to upload.</>
                ) : (
                    <>No matching assets found.</>
                )}
             </div>
        ) : (
            <AssetTree nodes={treeNodes} onUpload={handleTreeUpload} />
        )}
      </div>
    </div>
  );
};
