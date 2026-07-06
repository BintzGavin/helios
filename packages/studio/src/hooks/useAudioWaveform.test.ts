/**
 * @vitest-environment jsdom
 */
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
        const p = Promise.reject(new Error('Decode failed'));
        // Explicitly catch the rejection to prevent Node's UnhandledPromiseRejection
        p.catch(() => {});
        this.decodeAudioData = vi.fn().mockReturnValue(p);
    });
    (window as any).OfflineAudioContext = MockOfflineAudioContext;

    const { result } = renderHook(() => useAudioWaveform(url, 100));

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });

    expect(result.current.peaks).toBeNull();
  });

  it('logs warning and returns null when OfflineAudioContext is missing', async () => {
    const url = 'http://test.com/missing-context.mp3';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });

    // Remove OfflineAudioContext
    const originalContext = (window as any).OfflineAudioContext;
    delete (window as any).OfflineAudioContext;
    delete (window as any).webkitOfflineAudioContext;

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useAudioWaveform(url, 100));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("OfflineAudioContext not supported");
    });

    expect(result.current.peaks).toBeNull();
    expect(result.current.error).toBe(false);

    // Restore
    (window as any).OfflineAudioContext = originalContext;
    consoleSpy.mockRestore();
  });

  it('returns empty array when samplesPerPeak < 1', async () => {
    const url = 'http://test.com/low-sample-rate.mp3';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });

    // Mock OfflineAudioContext to return very low sampleRate
    MockOfflineAudioContext = vi.fn().mockImplementation(function(this: any) {
        this.decodeAudioData = vi.fn().mockImplementation((buffer: any) => {
          return Promise.resolve({
            sampleRate: 50, // very low sample rate
            length: 100,
            getChannelData: vi.fn().mockReturnValue(new Float32Array(100).fill(0.5))
          });
        });
    });
    (window as any).OfflineAudioContext = MockOfflineAudioContext;

    // Request high peaksPerSecond so that samplesPerPeak (50 / 100) < 1
    const { result } = renderHook(() => useAudioWaveform(url, 100));

    await waitFor(() => {
      expect(result.current.peaks).not.toBeNull();
    });

    expect(result.current.peaks).toBeInstanceOf(Float32Array);
    expect(result.current.peaks?.length).toBe(0);
    expect(result.current.error).toBe(false);
  });

  it('does not update error state if unmounted before fetch fails', async () => {
    const url = 'http://test.com/unmount-error.mp3';
    // delay rejection so unmount runs first
    mockFetch.mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch failed')), 10)));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderHook(() => useAudioWaveform(url, 100));
    unmount();
    // wait for rejection to happen
    await new Promise((resolve) => setTimeout(resolve, 20));
    consoleSpy.mockRestore();
  });

  it('does not update state if unmounted before fetch completes', async () => {
    const url = 'http://test.com/unmount.mp3';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });
    const { unmount } = renderHook(() => useAudioWaveform(url, 100));
    unmount(); // Unmount immediately
  });
});
