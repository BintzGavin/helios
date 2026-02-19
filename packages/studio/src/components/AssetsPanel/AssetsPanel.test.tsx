import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssetsPanel } from './AssetsPanel';
import { useStudio } from '../../context/StudioContext';

// Mock StudioContext
const mockUseStudio = {
  assets: [],
  uploadAsset: vi.fn(),
  createFolder: vi.fn()
};

vi.mock('../../context/StudioContext', () => ({
  useStudio: () => mockUseStudio
}));

// Mock AssetItem and FolderItem
vi.mock('./AssetItem', () => ({
  AssetItem: ({ asset }: { asset: any }) => <div data-testid="asset-item" data-type={asset.type}>{asset.name}</div>
}));

vi.mock('./FolderItem', () => ({
  FolderItem: ({ name, onClick }: { name: string, onClick: () => void }) => (
    <div data-testid="folder-item" onClick={onClick}>{name}</div>
  )
}));

describe('AssetsPanel', () => {
  const mockAssets = [
    { id: '1', name: 'image.png', type: 'image', url: '', relativePath: 'image.png' },
    { id: '2', name: 'video.mp4', type: 'video', url: '', relativePath: 'video.mp4' },
    { id: '3', name: 'audio.mp3', type: 'audio', url: '', relativePath: 'folder/audio.mp3' },
    { id: '4', name: 'subfolder', type: 'folder', url: '', relativePath: 'subfolder' },
    { id: '5', name: 'test.json', type: 'json', url: '', relativePath: 'subfolder/test.json' }
  ];

  beforeEach(() => {
    mockUseStudio.assets = mockAssets as any;
    mockUseStudio.createFolder.mockReset();
    mockUseStudio.uploadAsset.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders files and folders', () => {
    render(<AssetsPanel />);
    // Files at root: image.png, video.mp4
    // Folders at root: folder (inferred), subfolder (explicit)

    const folders = screen.getAllByTestId('folder-item');
    const files = screen.getAllByTestId('asset-item');

    expect(folders).toHaveLength(2);
    expect(folders[0]).toHaveTextContent('folder');
    expect(folders[1]).toHaveTextContent('subfolder');

    expect(files).toHaveLength(2);
    expect(files[0]).toHaveTextContent('image.png');
    expect(files[1]).toHaveTextContent('video.mp4');
  });

  it('filters by search query (flat view)', () => {
    render(<AssetsPanel />);
    const searchInput = screen.getByPlaceholderText('Search assets...');

    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Should find test.json inside subfolder, flattened
    const items = screen.getAllByTestId('asset-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('test.json');

    // Folders should be hidden in search
    expect(screen.queryByTestId('folder-item')).not.toBeInTheDocument();
  });

  it('navigates into folders', () => {
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');

    fireEvent.click(subfolder);

    // Now inside subfolder
    // Should see test.json
    const files = screen.getAllByTestId('asset-item');
    expect(files).toHaveLength(1);
    expect(files[0]).toHaveTextContent('test.json');

    // Should not see root files
    expect(screen.queryByText('image.png')).not.toBeInTheDocument();
  });

  it('creates a new folder', async () => {
    render(<AssetsPanel />);
    const createBtn = screen.getByText('New Folder');

    // Mock window.prompt
    vi.spyOn(window, 'prompt').mockReturnValue('My New Folder');

    fireEvent.click(createBtn);

    expect(window.prompt).toHaveBeenCalled();
    expect(mockUseStudio.createFolder).toHaveBeenCalledWith('My New Folder', '');
  });

  it('does not create folder if prompt cancelled', async () => {
    render(<AssetsPanel />);
    const createBtn = screen.getByText('New Folder');

    vi.spyOn(window, 'prompt').mockReturnValue(null);

    fireEvent.click(createBtn);

    expect(mockUseStudio.createFolder).not.toHaveBeenCalled();
  });
});
