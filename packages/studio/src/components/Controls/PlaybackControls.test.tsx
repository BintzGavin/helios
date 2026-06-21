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

  it('calls setPlaybackRate when speed changes', () => {
    render(<PlaybackControls />);
    const select = screen.getByTitle('Playback Speed');
    fireEvent.change(select, { target: { value: '2' } });
    expect(mockSetPlaybackRate).toHaveBeenCalledWith(2);
  });

  it('calls pause when play/pause button is clicked and isPlaying is true', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, isPlaying: true }
    });
    render(<PlaybackControls />);
    const button = screen.getByTitle('Play / Pause (Space)');
    fireEvent.click(button);
    expect(mockPause).toHaveBeenCalled();
  });

  it('calls play when play/pause button is clicked and isPlaying is false', () => {
    render(<PlaybackControls />);
    const button = screen.getByTitle('Play / Pause (Space)');
    fireEvent.click(button);
    expect(mockPlay).toHaveBeenCalled();
  });

  it('calls seek to inPoint then play when play/pause is clicked at the end', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, isPlaying: false, currentFrame: 300, duration: 10, fps: 30 },
      inPoint: 0,
      outPoint: 0
    });
    render(<PlaybackControls />);
    const button = screen.getByTitle('Play / Pause (Space)');
    fireEvent.click(button);
    expect(mockSeek).toHaveBeenCalledWith(0);
    expect(mockPlay).toHaveBeenCalled();
  });

  it('calls seek(inPoint) when rewind is clicked', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      inPoint: 10
    });
    render(<PlaybackControls />);
    const button = screen.getByTitle('Rewind / Restart (Home)');
    fireEvent.click(button);
    expect(mockSeek).toHaveBeenCalledWith(10);
  });

  it('calls seek(currentFrame - 1) when prev frame is clicked', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, currentFrame: 50 }
    });
    render(<PlaybackControls />);
    const button = screen.getByTitle('Previous Frame (Left Arrow)');
    fireEvent.click(button);
    expect(mockSeek).toHaveBeenCalledWith(49);
  });

  it('calls seek(0) when prev frame is clicked and currentFrame is 0', () => {
    render(<PlaybackControls />);
    const button = screen.getByTitle('Previous Frame (Left Arrow)');
    fireEvent.click(button);
    expect(mockSeek).toHaveBeenCalledWith(0);
  });

  it('calls seek(currentFrame + 1) when next frame is clicked', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, currentFrame: 50 }
    });
    render(<PlaybackControls />);
    const button = screen.getByTitle('Next Frame (Right Arrow)');
    fireEvent.click(button);
    expect(mockSeek).toHaveBeenCalledWith(51);
  });

  it('does nothing when controller is null', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      controller: null
    });
    render(<PlaybackControls />);
    const playPauseBtn = screen.getByTitle('Play / Pause (Space)');
    const rewindBtn = screen.getByTitle('Rewind / Restart (Home)');
    const prevBtn = screen.getByTitle('Previous Frame (Left Arrow)');
    const nextBtn = screen.getByTitle('Next Frame (Right Arrow)');

    // Buttons should be disabled
    expect(playPauseBtn).toBeDisabled();
    expect(rewindBtn).toBeDisabled();
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });
});
