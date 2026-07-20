import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssetsPanel } from './AssetsPanel';
import { useStudio } from '../../context/StudioContext';

// Mock StudioContext
const mockUseStudio = {
  assets: [],
  uploadAsset: vi.fn(),
  createFolder: vi.fn(),
  moveAsset: vi.fn()
};

vi.mock('../../context/StudioContext', () => ({
  useStudio: () => mockUseStudio
}));

// Mock AssetItem and FolderItem
vi.mock('./AssetItem', () => ({
  AssetItem: ({ asset }: { asset: any }) => <div data-testid="asset-item" data-type={asset.type}>{asset.name}</div>
}));

vi.mock('./FolderItem', () => ({
  FolderItem: ({ name, onClick, onDrop }: { name: string, onClick: () => void, onDrop: (e: any) => void }) => (
 <div data-testid="folder-item" onClick={onClick} onDrop={onDrop} data-name={name}>{name}</div>
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
    mockUseStudio.moveAsset.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders files and folders', () => {
    render(<AssetsPanel />);
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

    const items = screen.getAllByTestId('asset-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('test.json');
    expect(screen.queryByTestId('folder-item')).not.toBeInTheDocument();
  });

  it('navigates into folders', () => {
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');
    fireEvent.click(subfolder);

    const files = screen.getAllByTestId('asset-item');
    expect(files).toHaveLength(1);
    expect(files[0]).toHaveTextContent('test.json');
    expect(screen.queryByText('image.png')).not.toBeInTheDocument();
  });

  it('creates a new folder', async () => {
    render(<AssetsPanel />);
    const createBtn = screen.getByText('New Folder');
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

  it('changes filter type', () => {
    render(<AssetsPanel />);
    const select = document.querySelector('.assets-filter-select')!;
    fireEvent.change(select, { target: { value: 'image' } });
    expect((select as HTMLSelectElement).value).toBe('image');
  });

  it('navigates via breadcrumbs', () => {
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');
    fireEvent.click(subfolder);

    const homeCrumb = screen.getByText('Home');
    fireEvent.click(homeCrumb);

    expect(screen.getByText('subfolder')).toBeInTheDocument();
  });

  it('drops asset into folder', () => {
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: (key: string) => key === 'application/helios-asset-id' ? '1' : '',
      files: []
    };
    fireEvent.drop(subfolder, dropEvent);
    expect(mockUseStudio.moveAsset).toHaveBeenCalledWith('1', '4');
  });

  it('navigates via breadcrumbs deep', () => {
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');
    fireEvent.click(subfolder);

    const crumbs = screen.getAllByText('subfolder');
    const crumb = crumbs.find(c => c.classList.contains('breadcrumb-item'));
    if (crumb) {
       fireEvent.click(crumb);
    }
    expect(screen.getByText('test.json')).toBeInTheDocument();
  });

  it('handles root drop (move asset)', () => {
    render(<AssetsPanel />);
    const panel = document.querySelector('.assets-panel')!;

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: (key: string) => key === 'application/helios-asset-id' ? '2' : '',
      files: []
    };
    fireEvent.drop(panel, dropEvent);
  });

  it('handles drag over and drag leave overlay', () => {
    render(<AssetsPanel />);
    const panel = document.querySelector('.assets-panel')!;

    fireEvent.dragOver(panel);
    expect(screen.getByText('Drop files to upload to Root')).toBeInTheDocument();

    fireEvent.dragLeave(panel);
    expect(screen.queryByText('Drop files to upload to Root')).not.toBeInTheDocument();
  });

  it('handles drop external files', async () => {
    render(<AssetsPanel />);
    const panel = document.querySelector('.assets-panel')!;

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: () => '',
      files: { length: 2, 0: new File([], 'test1.png'), 1: new File([], 'test2.png'), item: (i: number) => [new File([], 'test1.png'), new File([], 'test2.png')][i] }
    };
    fireEvent.drop(panel, dropEvent);

    await waitFor(() => {
        expect(mockUseStudio.uploadAsset).toHaveBeenCalledTimes(2);
    });
  });

  it('handles external file drop on subfolder', async () => {
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: () => '',
      files: { length: 1, 0: new File([], 'test.png'), item: () => new File([], 'test.png') }
    };
    fireEvent.drop(subfolder, dropEvent);

    await waitFor(() => {
        expect(mockUseStudio.uploadAsset).toHaveBeenCalledWith(expect.any(File), 'subfolder');
    });
  });

  it('ignores move asset drop if target folder asset not found', () => {
    render(<AssetsPanel />);
    const panel = document.querySelector('.assets-panel')!;

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: (key: string) => key === 'application/helios-asset-id' ? '1' : '',
      files: []
    };

    fireEvent.drop(screen.getByText('folder'), dropEvent);

    expect(mockUseStudio.moveAsset).not.toHaveBeenCalled();
  });

  it('ignores move asset drop if target id evaluates empty via assets length 0', () => {
    mockUseStudio.assets = [];
    render(<AssetsPanel />);
    const panel = document.querySelector('.assets-panel')!;

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: (key: string) => key === 'application/helios-asset-id' ? '1' : '',
      files: []
    };

    fireEvent.drop(panel, dropEvent);
    expect(mockUseStudio.moveAsset).not.toHaveBeenCalled();
  });

  it('catches moveAsset errors silently', () => {
    mockUseStudio.moveAsset.mockRejectedValueOnce(new Error('Failed move'));
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: (key: string) => key === 'application/helios-asset-id' ? '1' : '',
      files: []
    };

    fireEvent.drop(subfolder, dropEvent);
    expect(mockUseStudio.moveAsset).toHaveBeenCalled();
  });

  it('triggers file upload input on Upload click', () => {
    render(<AssetsPanel />);
    const uploadBtn = screen.getByText('Upload');

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
    fireEvent.click(uploadBtn);
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('handles file input change with multiple files', async () => {
    render(<AssetsPanel />);
    const fileInput = document.querySelector('input[type="file"]')!;

    fireEvent.change(fileInput, { target: { files: { length: 2, 0: new File([], 'a.png'), 1: new File([], 'b.png'), item: (i: number) => [new File([], 'a.png'), new File([], 'b.png')][i] } } });

    await waitFor(() => {
        expect(mockUseStudio.uploadAsset).toHaveBeenCalledTimes(2);
    });
  });

  it('ignores file input change with no files', () => {
    render(<AssetsPanel />);
    const fileInput = document.querySelector('input[type="file"]')!;

    fireEvent.change(fileInput, { target: { files: [] } });

    expect(mockUseStudio.uploadAsset).not.toHaveBeenCalled();
  });

  it('handles dropping files inside an open subfolder path', async () => {
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');
    fireEvent.click(subfolder);

    const panel = document.querySelector('.assets-panel')!;

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: () => '',
      files: { length: 1, 0: new File([], 'inside.png'), item: () => new File([], 'inside.png') }
    };
    fireEvent.drop(panel, dropEvent);

    await waitFor(() => {
        expect(mockUseStudio.uploadAsset).toHaveBeenCalledWith(expect.any(File), 'subfolder');
    });
  });

  it('handles empty searchQuery with no assets (empty state)', () => {
    mockUseStudio.assets = [];
    render(<AssetsPanel />);
    expect(screen.getByText(/Folder is empty/i)).toBeInTheDocument();
  });

  it('handles searchQuery with no matching assets', () => {
    render(<AssetsPanel />);
    const searchInput = screen.getByPlaceholderText('Search assets...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent123' } });
    expect(screen.getByText('No matching assets found.')).toBeInTheDocument();
  });

  it('handles file drop when currentPath is empty and targetFolder is empty string', async () => {
    render(<AssetsPanel />);
    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: () => '',
      files: { length: 1, 0: new File([], 'test.png'), item: () => new File([], 'test.png') }
    };

    const panel = document.querySelector('.assets-panel')!;
    fireEvent.drop(panel, dropEvent);

    await waitFor(() => {
        expect(mockUseStudio.uploadAsset).toHaveBeenCalledWith(expect.any(File), '');
    });
  });

  it('handles drag over and drag leave overlay in a subfolder', () => {
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');
    fireEvent.click(subfolder);

    const panel = document.querySelector('.assets-panel')!;
    fireEvent.dragOver(panel);
    expect(screen.getByText('Drop files to upload to subfolder')).toBeInTheDocument();

    fireEvent.dragLeave(panel);
    expect(screen.queryByText('Drop files to upload to subfolder')).not.toBeInTheDocument();
  });

  it('handles empty e.dataTransfer.files length in drop', () => {
    mockUseStudio.uploadAsset.mockClear();
    render(<AssetsPanel />);
    const panel = document.querySelector('.assets-panel')!;

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: () => '',
      files: { length: 0 }
    };
    fireEvent.drop(panel, dropEvent);
    expect(mockUseStudio.uploadAsset).not.toHaveBeenCalled();
  });

  it('handles file input without ref', async () => {
    vi.spyOn(React, 'useRef').mockReturnValueOnce({ current: null });
    render(<AssetsPanel />);
    const fileInput = document.querySelector('input[type="file"]')!;
    fireEvent.change(fileInput, { target: { files: { length: 1, 0: new File([], 'test.png'), item: () => new File([], 'test.png') } } });
    await waitFor(() => expect(mockUseStudio.uploadAsset).toHaveBeenCalled());
    vi.restoreAllMocks();
  });

  it('handles empty targetFolder with non-empty currentPath on drop', () => {
    const orig = mockUseStudio.assets;
    mockUseStudio.assets = [...orig, { id: '6', name: '', type: 'folder', url: '', relativePath: '' }] as any;
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');
    fireEvent.click(subfolder);

    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: () => '',
      files: []
    };

    mockUseStudio.assets = orig;
  });

  it('handles searchQuery with filterType mismatch to test matchesType = false', () => {
    render(<AssetsPanel />);
    const select = document.querySelector('.assets-filter-select')!;
    fireEvent.change(select, { target: { value: 'video' } });

    const searchInput = screen.getByPlaceholderText('Search assets...');
    fireEvent.change(searchInput, { target: { value: 'image' } });

    expect(screen.getByText('No matching assets found.')).toBeInTheDocument();
  });

  it('navigates into nested folders', () => {
    const orig = mockUseStudio.assets;
    mockUseStudio.assets = [...orig, { id: '6', name: 'nested', type: 'folder', url: '', relativePath: 'subfolder/nested' }] as any;
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');
    fireEvent.click(subfolder);

    const nested = screen.getByText('nested');
    fireEvent.click(nested);

    expect(screen.getByText('nested')).toBeInTheDocument();
    mockUseStudio.assets = orig;
  });

  it('drops into nested folder', () => {
    const orig = mockUseStudio.assets;
    mockUseStudio.assets = [...orig, { id: '6', name: 'nested', type: 'folder', url: '', relativePath: 'subfolder/nested' }] as any;
    render(<AssetsPanel />);
    const subfolder = screen.getByText('subfolder');
    fireEvent.click(subfolder);

    const nested = screen.getByText('nested');
    const dropEvent = new Event('drop', { bubbles: true }) as any;
    dropEvent.dataTransfer = {
      getData: () => '',
      files: []
    };
    fireEvent.drop(nested, dropEvent);

    mockUseStudio.assets = orig;
  });
});
