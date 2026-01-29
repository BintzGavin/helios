import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlaybackControls } from './PlaybackControls';
import * as StudioContext from '../../context/StudioContext';

// Mock the context
vi.mock('../../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('PlaybackControls', () => {
  const mockSetAudioVolume = vi.fn();
  const mockSetAudioMuted = vi.fn();
  const mockPause = vi.fn();
  const mockPlay = vi.fn();
  const mockSeek = vi.fn();
  const mockSetPlaybackRate = vi.fn();
  const mockToggleLoop = vi.fn();

  const defaultPlayerState = {
    currentFrame: 0,
    duration: 10,
    fps: 30,
    playbackRate: 1,
    isPlaying: false,
    volume: 1,
    muted: false,
    inputProps: {},
  };

  const defaultContext = {
    controller: {
      setAudioVolume: mockSetAudioVolume,
      setAudioMuted: mockSetAudioMuted,
      pause: mockPause,
      play: mockPlay,
      seek: mockSeek,
      setPlaybackRate: mockSetPlaybackRate,
    },
    playerState: defaultPlayerState,
    loop: false,
    toggleLoop: mockToggleLoop,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders volume slider with correct value', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, volume: 0.5 }
    });

    render(<PlaybackControls />);
    const slider = screen.getByTitle('Volume: 50%') as HTMLInputElement;
    expect(slider).toBeInTheDocument();
    expect(slider.value).toBe('0.5');
  });

  it('calls setAudioVolume when slider changes', () => {
    render(<PlaybackControls />);
    const slider = screen.getByTitle('Volume: 100%');

    fireEvent.change(slider, { target: { value: '0.8' } });
    expect(mockSetAudioVolume).toHaveBeenCalledWith(0.8);
  });

  it('renders mute button with unmuted icon when muted is false', () => {
    render(<PlaybackControls />);
    expect(screen.getByTitle('Mute')).toBeInTheDocument();
    expect(screen.getByText('🔊')).toBeInTheDocument();
  });

  it('renders mute button with muted icon when muted is true', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, muted: true }
    });

    render(<PlaybackControls />);
    expect(screen.getByTitle('Unmute')).toBeInTheDocument();
    expect(screen.getByText('🔇')).toBeInTheDocument();
  });

  it('renders mute button with muted icon when volume is 0', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, volume: 0, muted: false }
    });

    render(<PlaybackControls />);
    expect(screen.getByTitle('Mute')).toBeInTheDocument(); // Title logic in component is {muted ? "Unmute" : "Mute"}
    expect(screen.getByText('🔇')).toBeInTheDocument();
  });

  it('calls setAudioMuted when mute button is clicked', () => {
    // Case 1: Mute
    render(<PlaybackControls />);
    const button = screen.getByTitle('Mute');
    fireEvent.click(button);
    expect(mockSetAudioMuted).toHaveBeenCalledWith(true);
  });

  it('calls setAudioMuted with false when unmute button is clicked', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, muted: true }
    });

    render(<PlaybackControls />);
    const button = screen.getByTitle('Unmute');
    fireEvent.click(button);
    expect(mockSetAudioMuted).toHaveBeenCalledWith(false);
  });
});
