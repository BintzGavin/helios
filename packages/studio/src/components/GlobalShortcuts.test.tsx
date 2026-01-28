import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GlobalShortcuts } from './GlobalShortcuts';
import * as StudioContext from '../context/StudioContext';

// Mock the context
vi.mock('../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('GlobalShortcuts', () => {
  const mockSeek = vi.fn();
  const mockPlay = vi.fn();
  const mockPause = vi.fn();
  const mockSetInPoint = vi.fn();
  const mockSetOutPoint = vi.fn();
  const mockToggleLoop = vi.fn();
  const mockSetHelpOpen = vi.fn();
  const mockSetSwitcherOpen = vi.fn();

  const defaultPlayerState = {
    currentFrame: 30, // 1 second
    duration: 10, // 10 seconds
    fps: 30,
    isPlaying: false,
  };

  const defaultContext = {
    controller: {
      seek: mockSeek,
      play: mockPlay,
      pause: mockPause,
    },
    playerState: defaultPlayerState,
    inPoint: 0,
    setInPoint: mockSetInPoint,
    outPoint: 300, // 10s * 30fps
    setOutPoint: mockSetOutPoint,
    toggleLoop: mockToggleLoop,
    setHelpOpen: mockSetHelpOpen,
    setSwitcherOpen: mockSetSwitcherOpen,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('toggles play/pause with Space', () => {
    render(<GlobalShortcuts />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(mockPlay).toHaveBeenCalled();

    // Test pause
    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, isPlaying: true }
    });
    // Re-render to pick up new state (or just fire event again if effect depends on state)
    // In our implementation, the effect depends on controller/state in callback.
    // The hook refs the callback, so it should see fresh state.
    // But we need to make sure the hook updates.

    // Easier to just re-render cleanly for second assertion or rely on ref mechanism
    // Let's re-render
    render(<GlobalShortcuts />);
    fireEvent.keyDown(window, { key: ' ' });
    expect(mockPause).toHaveBeenCalled();
  });

  it('seeks with Arrow keys', () => {
    render(<GlobalShortcuts />);

    // Left
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(mockSeek).toHaveBeenCalledWith(29); // 30 - 1

    // Right
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(mockSeek).toHaveBeenCalledWith(31); // 30 + 1

    // Shift + Left
    fireEvent.keyDown(window, { key: 'ArrowLeft', shiftKey: true });
    expect(mockSeek).toHaveBeenCalledWith(20); // 30 - 10

    // Shift + Right
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true });
    expect(mockSeek).toHaveBeenCalledWith(40); // 30 + 10
  });

  it('rewinds with Home', () => {
    render(<GlobalShortcuts />);
    fireEvent.keyDown(window, { key: 'Home' });
    expect(mockSeek).toHaveBeenCalledWith(0);
  });

  it('toggles loop with L', () => {
    render(<GlobalShortcuts />);
    fireEvent.keyDown(window, { key: 'l' });
    expect(mockToggleLoop).toHaveBeenCalled();
  });

  it('sets In point with I (clamped)', () => {
     (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, currentFrame: 300 }, // at end
        outPoint: 300
     });
     render(<GlobalShortcuts />);

     fireEvent.keyDown(window, { key: 'i' });
     expect(mockSetInPoint).toHaveBeenCalledWith(299); // outPoint - 1
  });

  it('sets Out point with O (clamped)', () => {
     (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, currentFrame: 0 },
        inPoint: 0
     });
     render(<GlobalShortcuts />);

     fireEvent.keyDown(window, { key: 'o' });
     expect(mockSetOutPoint).toHaveBeenCalledWith(1); // inPoint + 1
  });

  it('opens help with ?', () => {
    render(<GlobalShortcuts />);
    fireEvent.keyDown(window, { key: '?' });
    expect(mockSetHelpOpen).toHaveBeenCalledWith(true);
  });

  it('opens switcher with Cmd+K', () => {
    render(<GlobalShortcuts />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(mockSetSwitcherOpen).toHaveBeenCalledWith(true);
  });

  it('ignores input elements', () => {
      render(<GlobalShortcuts />);

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      fireEvent.keyDown(window, { key: ' ' });
      expect(mockPlay).not.toHaveBeenCalled();

      document.body.removeChild(input);
  });
});
