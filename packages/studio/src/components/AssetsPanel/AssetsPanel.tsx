import React, { useState, useRef, useMemo } from 'react';
import { useStudio, Asset } from '../../context/StudioContext';
import { AssetItem } from './AssetItem';
import { FolderItem } from './FolderItem';
import './AssetsPanel.css';

export const AssetsPanel: React.FC = () => {
  const { assets, uploadAsset, createFolder } = useStudio();
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<Asset['type'] | 'all'>('all');
  const [currentPath, setCurrentPath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent, targetFolder?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // If dropped on a specific folder item, use that. Otherwise use current path.
    const uploadDir = targetFolder !== undefined ?
        (currentPath ? `${currentPath}/${targetFolder}` : targetFolder) :
        currentPath;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
       for (let i = 0; i < e.dataTransfer.files.length; i++) {
           await uploadAsset(e.dataTransfer.files[i], uploadDir);
       }
    }
  };

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleCreateFolder = async () => {
      const name = window.prompt('Enter folder name:');
      if (name) {
          await createFolder(name, currentPath);
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          for (let i = 0; i < e.target.files.length; i++) {
              await uploadAsset(e.target.files[i], currentPath);
          }
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const content = useMemo(() => {
    // Flat View for Search
    if (searchQuery) {
        const files = assets.filter(asset => {
            const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === 'all' || asset.type === filterType;
            return matchesSearch && matchesType;
        });
        return { files, folders: [] };
    }

    // Tree View
    const folders = new Set<string>();
    const files: Asset[] = [];

    // Ensure prefix has trailing slash if not empty
    const prefix = currentPath ? `${currentPath}/` : '';

    assets.forEach(asset => {
        // Only consider assets starting with currentPath
        if (!asset.relativePath.startsWith(prefix)) return;

        // Remove prefix to get path relative to current folder
        const relative = asset.relativePath.slice(prefix.length);
        const parts = relative.split('/');

        if (parts.length > 1) {
            // It's in a subfolder
            folders.add(parts[0]);
        } else if (parts.length === 1 && parts[0] !== '') {
            if (asset.type === 'folder') {
                folders.add(parts[0]);
            } else {
                // It's a file in this folder
                if (filterType === 'all' || asset.type === filterType) {
                    files.push(asset);
                }
            }
        }
    });

    return {
        files,
        folders: Array.from(folders).sort()
    };
  }, [assets, currentPath, searchQuery, filterType]);

  const navigateTo = (path: string) => {
      setCurrentPath(path);
      setSearchQuery(''); // Clear search on nav
  };

  const enterFolder = (folderName: string) => {
      const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      navigateTo(newPath);
  };

  return (
    <div
        className="assets-panel"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e)}
    >
        {isDragging && (
            <div className="assets-drop-overlay">
                Drop files to upload to {currentPath || 'Root'}
            </div>
        )}

      <div className="assets-header">
         <div className="assets-header-top">
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
                Upload
             </button>
             <button
                className="assets-upload-btn"
                onClick={handleCreateFolder}
                style={{ marginLeft: '8px' }}
             >
                New Folder
             </button>
         </div>

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

         {!searchQuery && (
             <div className="assets-breadcrumbs">
                 <span
                    className={`breadcrumb-item ${!currentPath ? 'active' : ''}`}
                    onClick={() => navigateTo('')}
                 >
                    Home
                 </span>
                 {currentPath.split('/').map((part, i, arr) => {
                     const path = arr.slice(0, i + 1).join('/');
                     return (
                         <React.Fragment key={path}>
                             <span className="breadcrumb-separator">/</span>
                             <span
                                className={`breadcrumb-item ${i === arr.length - 1 ? 'active' : ''}`}
                                onClick={() => navigateTo(path)}
                             >
                                {part}
                             </span>
                         </React.Fragment>
                     );
                 })}
             </div>
         )}
      </div>

      <div className="assets-list">
        {!searchQuery && content.folders.map(folder => (
            <FolderItem
                key={folder}
                name={folder}
                onClick={() => enterFolder(folder)}
                onDrop={(e) => handleDrop(e, folder)}
            />
        ))}

        {content.files.map((asset) => (
            <AssetItem key={asset.id} asset={asset} />
        ))}

        {content.files.length === 0 && content.folders.length === 0 && (
             <div className="assets-empty">
                {searchQuery ? 'No matching assets found.' : (
                    <>
                        Folder is empty.<br/>
                        Drag & drop to upload.
                    </>
                )}
             </div>
        )}
      </div>
    </div>
  );
};
