import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssetItem } from './AssetItem';
import { Asset } from '../../context/StudioContext';

// Mock useStudio
const mockDeleteAsset = vi.fn();
vi.mock('../../context/StudioContext', () => ({
  useStudio: () => ({
    deleteAsset: mockDeleteAsset
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
    const asset: Asset = { id: '1', name: 'test.png', url: '/test.png', type: 'image' };
    render(<AssetItem asset={asset} />);

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/test.png');
    expect(screen.getByText('test.png')).toBeInTheDocument();
  });

  it('renders video asset correctly', () => {
    const asset: Asset = { id: '2', name: 'test.mp4', url: '/test.mp4', type: 'video' };
    render(<AssetItem asset={asset} />);

    const video = document.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', '/test.mp4');
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
  });

  it('renders audio asset correctly', () => {
    const asset: Asset = { id: '3', name: 'test.mp3', url: '/test.mp3', type: 'audio' };
    render(<AssetItem asset={asset} />);

    const audioPreview = document.querySelector('.audio-preview');
    expect(audioPreview).toBeInTheDocument();
  });

  it('toggles audio playback on click', () => {
    const asset: Asset = { id: '3', name: 'test.mp3', url: '/test.mp3', type: 'audio' };
    render(<AssetItem asset={asset} />);

    const audioPreview = document.querySelector('.audio-preview')!;

    // First click -> Play
    fireEvent.click(audioPreview);
    expect(mockPlay).toHaveBeenCalled();

    // Since we can't easily spy on the constructor call with the class mock (unless we spy on global.Audio itself),
    // we verify the interaction on the instance methods.
  });

  it('renders font asset correctly', () => {
    const asset: Asset = { id: '4', name: 'test.ttf', url: '/test.ttf', type: 'font' };
    render(<AssetItem asset={asset} />);

    const fontPreview = document.querySelector('.font-preview');
    expect(fontPreview).toBeInTheDocument();
    expect(fontPreview).toHaveTextContent('Aa');
  });

  it('shows delete button on hover and calls deleteAsset on click', () => {
    const asset: Asset = { id: '1', name: 'test.png', url: '/test.png', type: 'image' };
    render(<AssetItem asset={asset} />);

    const container = screen.getByText('test.png').closest('.asset-item')!;

    fireEvent.mouseEnter(container);
    const deleteBtn = document.querySelector('.delete-btn');
    expect(deleteBtn).toBeInTheDocument();

    // Mock confirm
    window.confirm = vi.fn(() => true);

    fireEvent.click(deleteBtn!);
    expect(mockDeleteAsset).toHaveBeenCalledWith('1');
  });
});
