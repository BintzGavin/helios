import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAudioWaveform } from './useAudioWaveform';

describe('useAudioWaveform', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let MockOfflineAudioContext: any;

  beforeEach(() => {
    // Reset fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Create a mock OfflineAudioContext class
    MockOfflineAudioContext = class {
      decodeAudioData = vi.fn().mockImplementation((buffer) => {
        return Promise.resolve({
          sampleRate: 48000,
          length: 48000, // 1 second
          getChannelData: vi.fn().mockReturnValue(new Float32Array(48000).fill(0.5)) // fill with some audio data
        });
      });
    };

    // Attach spy so we can check it was called with correct args
    MockOfflineAudioContext = vi.fn().mockImplementation(function(this: any, channels: number, length: number, sampleRate: number) {
        this.decodeAudioData = vi.fn().mockImplementation((buffer: any) => {
          return Promise.resolve({
            sampleRate: 48000,
            length: 48000, // 1 second
            getChannelData: vi.fn().mockReturnValue(new Float32Array(48000).fill(0.5)) // fill with some audio data
          });
        });
    });

    // Attach to window object
    (window as any).OfflineAudioContext = MockOfflineAudioContext;

    // Reset module cache (we need to clear the internal map cache in the hook file if possible,
    // but since it's a module level variable, we might have to use different URLs for each test to avoid cache hits)
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null initially and then resolves to peaks array', async () => {
    // Mock successful fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });

    const url = 'http://test.com/audio1.mp3';

    // Render the hook
    const { result } = renderHook(() => useAudioWaveform(url, 100));

    // Initially peaks should be null
    expect(result.current.peaks).toBeNull();
    expect(result.current.error).toBe(false);

    // Wait for async operations to complete
    await waitFor(() => {
      expect(result.current.peaks).not.toBeNull();
    });

    // We specified 100 peaksPerSecond for 1 second of audio data
    expect(result.current.peaks).toBeInstanceOf(Float32Array);
    expect(result.current.peaks?.length).toBe(100);
    expect(result.current.error).toBe(false);

    // Verify fetch and context usage
    expect(mockFetch).toHaveBeenCalledWith(url);
    expect(MockOfflineAudioContext).toHaveBeenCalledWith(1, 1, 48000);
  });

  it('uses cached peaks if URL was already processed', async () => {
    const url = 'http://test.com/cached-audio.mp3';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });

    // First render to cache it
    const { result, unmount } = renderHook(() => useAudioWaveform(url, 100));

    await waitFor(() => {
      expect(result.current.peaks).not.toBeNull();
    });

    unmount();

    // Clear mocks to verify fetch is not called again
    vi.clearAllMocks();

    // Second render should immediately have peaks
    const { result: cachedResult } = renderHook(() => useAudioWaveform(url, 100));

    expect(cachedResult.current.peaks).not.toBeNull();
    expect(cachedResult.current.peaks?.length).toBe(100);
    expect(mockFetch).not.toHaveBeenCalled(); // Fetch should not be called again
  });

  it('handles fetch errors correctly', async () => {
    const url = 'http://test.com/error.mp3';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found'
    });

    const { result } = renderHook(() => useAudioWaveform(url, 100));

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });

    expect(result.current.peaks).toBeNull();
  });

  it('returns null immediately if src is empty', () => {
    const { result } = renderHook(() => useAudioWaveform('', 100));

    expect(result.current.peaks).toBeNull();
    expect(result.current.error).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles decode errors gracefully', async () => {
    const url = 'http://test.com/decode-error.mp3';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });

    // Mock decodeAudioData to reject
    MockOfflineAudioContext = vi.fn().mockImplementation(function(this: any) {
        this.decodeAudioData = vi.fn().mockRejectedValue(new Error('Decode failed'));
    });
    (window as any).OfflineAudioContext = MockOfflineAudioContext;

    const { result } = renderHook(() => useAudioWaveform(url, 100));

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });

    expect(result.current.peaks).toBeNull();
  });
});
