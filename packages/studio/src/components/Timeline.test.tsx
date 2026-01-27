import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
  };

  const defaultContext = {
    controller: { seek: mockSeek },
    playerState: defaultPlayerState,
    inPoint: 0,
    setInPoint: mockSetInPoint,
    outPoint: 300, // 10s * 30fps
    setOutPoint: mockSetOutPoint,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders current time and markers correctly', () => {
    render(<Timeline />);

    // Check time display: 30 frames / 30 fps = 1.00s
    expect(screen.getByText(/0:01.00/)).toBeInTheDocument();

    // Check In/Out markers display
    expect(screen.getByText(/In: 0/)).toBeInTheDocument();
    expect(screen.getByText(/Out: 300/)).toBeInTheDocument();
    expect(screen.getByText(/Fr: 30/)).toBeInTheDocument();
  });

  it('seeks when clicking on the track', () => {
    const { container } = render(<Timeline />);
    const trackArea = container.querySelector('.timeline-track-area');

    expect(trackArea).toBeInTheDocument();

    if (trackArea) {
      // Mock getBoundingClientRect
      trackArea.getBoundingClientRect = vi.fn(() => ({
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

      // Click at 50% (x=500) -> Frame 150
      fireEvent.mouseDown(trackArea, { clientX: 500 });

      expect(mockSeek).toHaveBeenCalledWith(150);
    }
  });

  it('clamps In point so it cannot exceed Out point - 1', () => {
     // Mocking state update by just checking the call
     // But wait, the component clamps inside the event handler.
     // If we use keyboard shortcut 'i'

     // Scenario: currentFrame is 299. OutPoint is 300.
     // 'i' should set InPoint to 299.

     // Scenario: currentFrame is 300 (OutPoint).
     // 'i' should set InPoint to 299 (OutPoint - 1).

     (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, currentFrame: 300 }
     });

     render(<Timeline />);

     fireEvent.keyDown(window, { key: 'i' });

     expect(mockSetInPoint).toHaveBeenCalledWith(299);
  });

  it('clamps Out point so it cannot be less than In point + 1', () => {
      // Scenario: currentFrame is 0. InPoint is 0.
      // 'o' should set OutPoint to 1 (InPoint + 1).

      (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, currentFrame: 0 }
     });

     render(<Timeline />);

     fireEvent.keyDown(window, { key: 'o' });

     expect(mockSetOutPoint).toHaveBeenCalledWith(1);
  });

  it('renders caption markers from playerState.captions', () => {
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
  });
});
