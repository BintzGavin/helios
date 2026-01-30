import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetsPanel } from './AssetsPanel';
import { useStudio } from '../../context/StudioContext';

// Mock StudioContext
vi.mock('../../context/StudioContext', () => ({
  useStudio: vi.fn(),
  // We don't need to mock Asset interface
}));

// Mock AssetItem to avoid FontFace issues and simplify testing
vi.mock('./AssetItem', () => ({
  AssetItem: ({ asset }: { asset: any }) => <div data-testid="asset-item" data-type={asset.type}>{asset.name}</div>
}));

describe('AssetsPanel', () => {
  const mockAssets = [
    { id: '1', name: 'image.png', type: 'image', url: '' },
    { id: '2', name: 'video.mp4', type: 'video', url: '' },
    { id: '3', name: 'audio.mp3', type: 'audio', url: '' },
    { id: '4', name: 'font.ttf', type: 'font', url: '' },
    { id: '5', name: 'test.json', type: 'json', url: '' }
  ];

  beforeEach(() => {
    (useStudio as any).mockReturnValue({
      assets: mockAssets,
      uploadAsset: vi.fn()
    });
  });

  it('renders all assets initially', () => {
    render(<AssetsPanel />);
    expect(screen.getAllByTestId('asset-item')).toHaveLength(5);
  });

  it('filters by search query', () => {
    render(<AssetsPanel />);
    const searchInput = screen.getByPlaceholderText('Search assets...');

    fireEvent.change(searchInput, { target: { value: 'video' } });

    const items = screen.getAllByTestId('asset-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('video.mp4');
  });

  it('filters by type', () => {
    render(<AssetsPanel />);
    const typeSelect = screen.getByRole('combobox'); // Select is a combobox

    fireEvent.change(typeSelect, { target: { value: 'audio' } });

    const items = screen.getAllByTestId('asset-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('audio.mp3');
  });

  it('combines search and type filter', () => {
    // Override mock for this test
    const extendedAssets = [
        ...mockAssets,
        { id: '6', name: 'config.json', type: 'json', url: '' }
    ];
    (useStudio as any).mockReturnValue({
        assets: extendedAssets,
        uploadAsset: vi.fn()
    });

    render(<AssetsPanel />);
    const typeSelect = screen.getByRole('combobox');
    const searchInput = screen.getByPlaceholderText('Search assets...');

    fireEvent.change(typeSelect, { target: { value: 'json' } });
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const items = screen.getAllByTestId('asset-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('test.json');
  });

  it('shows no assets found message when filter returns nothing', () => {
    render(<AssetsPanel />);
    const searchInput = screen.getByPlaceholderText('Search assets...');

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.queryByTestId('asset-item')).not.toBeInTheDocument();
    expect(screen.getByText('No matching assets found.')).toBeInTheDocument();
  });
});
