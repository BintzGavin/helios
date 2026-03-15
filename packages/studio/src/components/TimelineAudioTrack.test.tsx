/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimelineAudioTrack } from './TimelineAudioTrack';
import * as useAudioWaveformModule from '../hooks/useAudioWaveform';
import type { AudioTrackMetadata } from '@helios-project/core';

// Mock the hook
vi.mock('../hooks/useAudioWaveform', () => ({
  useAudioWaveform: vi.fn()
}));

describe('TimelineAudioTrack', () => {
  const defaultTrack: AudioTrackMetadata = {
    id: 'test-track',
    src: 'test-audio.mp3',
    startTime: 0,
    duration: 5,
    volume: 1,
    muted: false
  };

  const defaultProps = {
    track: defaultTrack,
    fps: 30,
    height: 40,
    top: 10,
    totalFrames: 300, // 10 seconds total
    containerWidth: 1000,
    getPercent: (frame: number) => (frame / 300) * 100
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders track with correct positioning and width', () => {
    // Return empty peaks so canvas logic doesn't crash but still renders container
    vi.spyOn(useAudioWaveformModule, 'useAudioWaveform').mockReturnValue({ peaks: null, error: false });

    const { container } = render(<TimelineAudioTrack {...defaultProps} />);
    const trackDiv = container.querySelector('.timeline-audio-track') as HTMLElement;

    expect(trackDiv).toBeInTheDocument();

    // Start time 0 -> left 0%
    expect(trackDiv.style.left).toBe('0%');
    // Duration 5s at 30fps = 150 frames. 150/300 = 50%
    expect(trackDiv.style.width).toBe('50%');
    // Top 10px
    expect(trackDiv.style.top).toBe('10px');
    // Height 40px
    expect(trackDiv.style.height).toBe('40px');
  });

  it('handles non-zero start time', () => {
    vi.spyOn(useAudioWaveformModule, 'useAudioWaveform').mockReturnValue({ peaks: null, error: false });

    const trackWithOffset = { ...defaultTrack, startTime: 2 };
    const { container } = render(<TimelineAudioTrack {...defaultProps} track={trackWithOffset} />);
    const trackDiv = container.querySelector('.timeline-audio-track') as HTMLElement;

    // Start time 2s at 30fps = 60 frames. 60/300 = 20%
    expect(trackDiv.style.left).toBe('20%');
  });

  it('draws waveform on canvas when peaks are available', () => {
    // Create some fake peaks
    const fakePeaks = new Float32Array([0.1, 0.5, 0.9, 0.3]);
    vi.spyOn(useAudioWaveformModule, 'useAudioWaveform').mockReturnValue({ peaks: fakePeaks, error: false });

    // Mock canvas context
    const mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: ''
    };

    // We need to intercept the canvas creation to provide our mock context
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);

    const { container } = render(<TimelineAudioTrack {...defaultProps} />);

    // The component should have rendered the canvas
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    // Verify canvas dimensions were set
    // trackWidthPx = (150 / 300) * 1000 = 500
    expect(canvas?.width).toBe(500);
    expect(canvas?.height).toBe(40);

    // Verify drawing operations
    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 500, 40);

    // Since width is 500 and we have 4 peaks, peaksPerPixel = 4 / 500 = 0.008
    // This means multiple pixels will share the same peak value, or more likely in our loop,
    // the max calculation will result in fillRect being called 500 times.
    expect(mockContext.fillRect).toHaveBeenCalledTimes(500);

    // Restore original getContext
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('skips drawing if canvas width is 0', () => {
    const fakePeaks = new Float32Array([0.1, 0.5, 0.9, 0.3]);
    vi.spyOn(useAudioWaveformModule, 'useAudioWaveform').mockReturnValue({ peaks: fakePeaks, error: false });

    const mockContext = { clearRect: vi.fn(), fillRect: vi.fn() };
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);

    // Render with 0 duration track
    const zeroDurationTrack = { ...defaultTrack, duration: 0 };
    render(<TimelineAudioTrack {...defaultProps} track={zeroDurationTrack} />);

    // Should not have drawn anything
    expect(mockContext.clearRect).not.toHaveBeenCalled();

    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });
});
