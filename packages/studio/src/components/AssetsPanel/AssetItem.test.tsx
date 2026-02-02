import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetItem } from './AssetItem';
import { Asset } from '../../context/StudioContext';

// Mock useToast
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() })
}));

// Mock useStudio
const mockDeleteAsset = vi.fn();
const mockRenameAsset = vi.fn(() => Promise.resolve());
vi.mock('../../context/StudioContext', () => ({
  useStudio: () => ({
    deleteAsset: mockDeleteAsset,
    renameAsset: mockRenameAsset
  })
}));

// Mock Audio
const mockPlay = vi.fn(() => Promise.resolve());
const mockPause = vi.fn();

global.Audio = class {
  play = mockPlay;
  pause = mockPause;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  onended: (() => void) | null = null;
  constructor(url?: string) {
    // optional logic
  }
} as any;

// Mock FontFace
global.FontFace = class {
  load = () => Promise.resolve({ family: 'test-font' });
  constructor(name: string, url: string) {}
} as any;

// Mock document.fonts
(document as any).fonts = {
  add: vi.fn()
};

describe('AssetItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders image asset correctly', () => {
    const asset: Asset = { id: '1', name: 'test.png', url: '/test.png', type: 'image', relativePath: 'images/test.png' };
    render(<AssetItem asset={asset} />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/test.png');
    expect(screen.getByText('test.png')).toBeInTheDocument();

    // Verify tooltip shows relative path
    const container = screen.getByText('test.png').closest('.asset-item');
    expect(container).toHaveAttribute('title', 'images/test.png');
  });

  it('renders video asset correctly', () => {
    const asset: Asset = { id: '2', name: 'test.mp4', url: '/test.mp4', type: 'video', relativePath: 'test.mp4' };
    render(<AssetItem asset={asset} />);

    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', '/test.mp4');
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
  });

  it('renders audio asset correctly', () => {
    const asset: Asset = { id: '3', name: 'test.mp3', url: '/test.mp3', type: 'audio', relativePath: 'audio/test.mp3' };
    render(<AssetItem asset={asset} />);

    const audioPreview = document.querySelector('.audio-preview');
    expect(audioPreview).toBeInTheDocument();
  });

  it('toggles audio playback on click', () => {
    const asset: Asset = { id: '3', name: 'test.mp3', url: '/test.mp3', type: 'audio', relativePath: 'audio/test.mp3' };
    render(<AssetItem asset={asset} />);

    const audioPreview = document.querySelector('.audio-preview')!;

    // First click -> Play
    fireEvent.click(audioPreview);
    expect(mockPlay).toHaveBeenCalled();

    // Since we can't easily spy on the constructor call with the class mock (unless we spy on global.Audio itself),
    // we verify the interaction on the instance methods.
  });

  it('renders font asset correctly', () => {
    const asset: Asset = { id: '4', name: 'test.ttf', url: '/test.ttf', type: 'font', relativePath: 'fonts/test.ttf' };
    render(<AssetItem asset={asset} />);

    const fontPreview = document.querySelector('.font-preview');
    expect(fontPreview).toBeInTheDocument();
    expect(fontPreview).toHaveTextContent('Aa');
  });

  it('shows delete button on hover and confirms delete via modal', () => {
    const asset: Asset = { id: '1', name: 'test.png', url: '/test.png', type: 'image', relativePath: 'test.png' };
    render(<AssetItem asset={asset} />);

    const container = screen.getByText('test.png').closest('.asset-item')!;

    fireEvent.mouseEnter(container);
    const deleteBtn = document.querySelector('.delete-btn');
    expect(deleteBtn).toBeInTheDocument();

    // Ensure confirm is not used
    const confirmSpy = vi.spyOn(window, 'confirm');

    fireEvent.click(deleteBtn!);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mockDeleteAsset).not.toHaveBeenCalled();

    // Check for Modal
    expect(screen.getByText('Delete Asset')).toBeInTheDocument();

    // Click Delete in Modal (find button by text 'Delete')
    // We need to be specific because Title also says "Delete Asset"
    // Use selector button
    const confirmBtn = screen.getAllByText('Delete').find(el => el.tagName === 'BUTTON');
    expect(confirmBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn!);

    expect(mockDeleteAsset).toHaveBeenCalledWith('1');

    // Modal should close
    expect(screen.queryByText('Are you sure you want to delete "test.png"? This action cannot be undone and may break compositions referencing this file.')).not.toBeInTheDocument();
  });

  it('shows rename warning modal when renaming', async () => {
    const asset: Asset = { id: '1', name: 'test.png', url: '/test.png', type: 'image', relativePath: 'test.png' };
    render(<AssetItem asset={asset} />);

    const container = screen.getByText('test.png').closest('.asset-item')!;
    fireEvent.mouseEnter(container);

    // Click edit
    const editBtn = document.querySelector('.rename-btn');
    fireEvent.click(editBtn!);

    // Change input
    const input = screen.getByDisplayValue('test.png');
    fireEvent.change(input, { target: { value: 'new.png' } });

    // Submit (blur)
    fireEvent.blur(input);

    // Modal should appear
    expect(screen.getByText('Rename Asset')).toBeInTheDocument();
    expect(screen.getByText(/Renaming this asset will change its file path/)).toBeInTheDocument();
    expect(mockRenameAsset).not.toHaveBeenCalled();

    // Click Rename in Modal
    const confirmBtn = screen.getAllByText('Rename').find(el => el.tagName === 'BUTTON');
    fireEvent.click(confirmBtn!);

    expect(mockRenameAsset).toHaveBeenCalledWith('1', 'new.png');
  });

  it('renders new asset types (model, json, shader) correctly', () => {
    const model: Asset = { id: 'm1', name: 'box.glb', url: '/box.glb', type: 'model', relativePath: 'box.glb' };
    const json: Asset = { id: 'j1', name: 'data.json', url: '/data.json', type: 'json', relativePath: 'data.json' };
    const shader: Asset = { id: 's1', name: 'frag.glsl', url: '/frag.glsl', type: 'shader', relativePath: 'frag.glsl' };

    const { rerender } = render(<AssetItem asset={model} />);
    expect(screen.getByText('📦')).toBeInTheDocument();
    // Use closest to find the asset item container
    const modelContainer = screen.getByText('📦').closest('.asset-item');
    expect(modelContainer).toHaveAttribute('title', 'box.glb');

    rerender(<AssetItem asset={json} />);
    expect(screen.getByText('{}')).toBeInTheDocument();
    const jsonContainer = screen.getByText('{}').closest('.asset-item');
    expect(jsonContainer).toHaveAttribute('title', 'data.json');

    rerender(<AssetItem asset={shader} />);
    expect(screen.getByText('⚡')).toBeInTheDocument();
    const shaderContainer = screen.getByText('⚡').closest('.asset-item');
    expect(shaderContainer).toHaveAttribute('title', 'frag.glsl');
  });
});
