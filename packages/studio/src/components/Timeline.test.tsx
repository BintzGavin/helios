import React from 'react';
import { render, screen, fireEvent, act, createEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Timeline } from './Timeline';
import * as StudioContext from '../context/StudioContext';

// Mock the context
vi.mock('../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('Timeline', () => {
  const mockSeek = vi.fn();
  const mockSetInPoint = vi.fn();
  const mockSetOutPoint = vi.fn();

  const defaultPlayerState = {
    currentFrame: 30, // 1 second
    duration: 10, // 10 seconds
    fps: 30,
    playbackRate: 1,
    isPlaying: false,
    inputProps: {},
    availableAudioTracks: [],
    audioTracks: {},
  };

  const defaultContext = {
    controller: { seek: mockSeek },
    playerState: defaultPlayerState,
    inPoint: 0,
    setInPoint: mockSetInPoint,
    outPoint: 300, // 10s * 30fps
    setOutPoint: mockSetOutPoint,
    audioAssets: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders current time and markers correctly', () => {
    render(<Timeline />);

    // Check time display: 30 frames / 30 fps = 1.00s
    expect(screen.getByText(/00:00:01:00/)).toBeInTheDocument();

    // Check In/Out markers display
    expect(screen.getByText(/In: 0/)).toBeInTheDocument();
    expect(screen.getByText(/Out: 300/)).toBeInTheDocument();
    expect(screen.getByText(/Fr: 30/)).toBeInTheDocument();
  });

  it('renders zoom control', () => {
    render(<Timeline />);
    expect(screen.getByTitle('Zoom Timeline')).toBeInTheDocument();
  });

  it('seeks when clicking on the content', () => {
    const { container } = render(<Timeline />);
    const content = container.querySelector('.timeline-content');

    expect(content).toBeInTheDocument();

    if (content) {
      // Mock getBoundingClientRect
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 50,
        bottom: 50,
        right: 1000,
        x: 0,
        y: 0,
        toJSON: () => {}
      }));

      // Click at 50% (x=500) -> Frame 150 (300 total frames * 0.5)
      // defaultContext has 300 frames (10s * 30fps)
      fireEvent.mouseDown(content, { clientX: 500 });

      expect(mockSeek).toHaveBeenCalledWith(150);
    }
  });

  it('updates width when zoom changes', () => {
    const { container } = render(<Timeline />);
    const slider = screen.getByTitle('Zoom Timeline');
    const content = container.querySelector('.timeline-content');

    // Default zoom 0 -> width 100%
    expect(content).toHaveStyle('width: 100%');

    // Change zoom
    fireEvent.change(slider, { target: { value: '50' } });

    expect(content).not.toHaveStyle('width: 100%');

    const style = content?.getAttribute('style');
    expect(style).toContain('width:');
    expect(style).toMatch(/px/);
  });

  it('renders caption markers correctly positioned', () => {
      const captions = [
          { startTime: 0, endTime: 1000, text: 'Hello' },
          { startTime: 2000, endTime: 3000, text: 'World' }
      ];

      (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
      });

      const { container } = render(<Timeline />);
      const markers = container.querySelectorAll('.timeline-caption-marker');

      expect(markers).toHaveLength(2);
      expect(markers[0]).toHaveAttribute('title', 'Hello');
      expect(markers[1]).toHaveAttribute('title', 'World');

      // Check vertical position (Lane 0 = 28px)
      // videoTrackTop = RULER_HEIGHT(24) + TRACK_GAP(4) = 28px
      expect(markers[0]).toHaveStyle('top: 28px');
  });

  it('renders composition markers correctly positioned', () => {
    const markers = [
      { id: 'm1', time: 1, label: 'Start', color: '#ff0000' },
      { id: 'm2', time: 5, label: 'Mid', color: '#00ff00' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, markers }
    });

    const { container } = render(<Timeline />);
    const renderedMarkers = container.querySelectorAll('.timeline-marker-comp');

    expect(renderedMarkers).toHaveLength(2);
    expect(renderedMarkers[0]).toHaveAttribute('title', 'Start (m1)');
    expect(renderedMarkers[1]).toHaveAttribute('title', 'Mid (m2)');

    // Check vertical position (Lane 0 = 28px)
    expect(renderedMarkers[0]).toHaveStyle('top: 28px');

    // Test click
    const marker = renderedMarkers[1];
    const event = createEvent.mouseDown(marker);
    event.stopPropagation = vi.fn();
    fireEvent(marker, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(mockSeek).toHaveBeenCalledWith(150); // 5s * 30fps = 150
  });

  it('renders audio tracks stacked vertically', () => {
    const availableAudioTracks = [
      { id: 'track1', startTime: 2, duration: 4 }, // Start 2s, End 6s
      { id: 'track2', startTime: 8, duration: 1 }  // Start 8s, End 9s
    ];

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, availableAudioTracks }
    });

    const { container } = render(<Timeline />);
    const tracks = container.querySelectorAll('.timeline-audio-track');

    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toHaveAttribute('title', 'Audio: track1');
    expect(tracks[1]).toHaveAttribute('title', 'Audio: track2');

    // Check Track 1 (Lane 1)
    // Top = VideoTop(28) + TrackHeight(24) + Gap(4) = 56px
    const style1 = tracks[0].getAttribute('style');
    expect(style1).toContain('left: 20%');
    expect(style1).toContain('width: 40%');
    expect(style1).toContain('top: 56px');

    // Check Track 2 (Lane 2)
    // Top = 56 + 24 + 4 = 84px
    const style2 = tracks[1].getAttribute('style');
    expect(style2).toContain('top: 84px');
  });
});
