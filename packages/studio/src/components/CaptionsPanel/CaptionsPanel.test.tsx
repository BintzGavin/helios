import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CaptionsPanel } from './CaptionsPanel';
import * as StudioContext from '../../context/StudioContext';

// Mock the context
vi.mock('../../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('CaptionsPanel', () => {
  const mockSetInputProps = vi.fn();
  const mockSetCaptions = vi.fn();

  const defaultPlayerState = {
    currentFrame: 30, // 1 second
    duration: 10,
    fps: 30,
    playbackRate: 1,
    isPlaying: false,
    inputProps: {},
    captions: []
  };

  const defaultContext = {
    controller: {
        setInputProps: mockSetInputProps,
        instance: {
            setCaptions: mockSetCaptions
        }
    },
    playerState: defaultPlayerState,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders "No captions loaded" when empty', () => {
    render(<CaptionsPanel />);
    expect(screen.getByText('No captions loaded')).toBeInTheDocument();
  });

  it('renders existing captions correctly', () => {
    const captions = [
        { startTime: 0, endTime: 1000, text: 'Hello' },
        { startTime: 2000, endTime: 3000, text: 'World' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    expect(screen.getByDisplayValue('Hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('World')).toBeInTheDocument();
    // 0ms -> 00:00.000
    expect(screen.getByDisplayValue('00:00.000')).toBeInTheDocument();
    // 1000ms -> 00:01.000
    expect(screen.getByDisplayValue('00:01.000')).toBeInTheDocument();
  });

  it('adds a new caption when Add button is clicked', () => {
     render(<CaptionsPanel />);
     const addButton = screen.getByText('+ Add');
     fireEvent.click(addButton);

     // Should call setCaptions with one new caption
     expect(mockSetCaptions).toHaveBeenCalledTimes(1);
     const newCaptions = mockSetCaptions.mock.calls[0][0];
     expect(newCaptions).toHaveLength(1);
     expect(newCaptions[0].text).toBe('New Caption');
     expect(newCaptions[0].startTime).toBe(1000); // 30 frames @ 30fps = 1000ms
  });

  it('updates a caption on blur', () => {
    const captions = [
        { startTime: 0, endTime: 1000, text: 'Hello' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const textInput = screen.getByDisplayValue('Hello');
    fireEvent.change(textInput, { target: { value: 'Hello Updated' } });
    fireEvent.blur(textInput);

    expect(mockSetCaptions).toHaveBeenCalledTimes(1);
    const updated = mockSetCaptions.mock.calls[0][0];
    expect(updated[0].text).toBe('Hello Updated');
  });

  it('deletes a caption', () => {
    const captions = [
        { startTime: 0, endTime: 1000, text: 'Hello' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
    });

    render(<CaptionsPanel />);

    const deleteButton = screen.getByTitle('Delete caption');
    fireEvent.click(deleteButton);

    expect(mockSetCaptions).toHaveBeenCalledWith([]);
  });

  it('falls back to setInputProps if setCaptions is missing', () => {
      const contextWithoutInstance = {
          ...defaultContext,
          controller: {
              setInputProps: mockSetInputProps,
              // No instance
          }
      };

      (StudioContext.useStudio as any).mockReturnValue(contextWithoutInstance);

      render(<CaptionsPanel />);
      const addButton = screen.getByText('+ Add');
      fireEvent.click(addButton);

      expect(mockSetInputProps).toHaveBeenCalledTimes(1);
      const props = mockSetInputProps.mock.calls[0][0];
      expect(props.captions).toHaveLength(1);
  });
});
