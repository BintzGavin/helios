import { describe, it, expect, vi } from 'vitest';
import { Helios } from './Helios.js';
import { AudioTrackMetadata } from './drivers/index.js';

describe('Helios - Headless Audio Tracks', () => {
  const mockTracks: AudioTrackMetadata[] = [
    { id: 'track1', src: 'audio1.mp3', startTime: 0, duration: 10 },
    { id: 'track2', src: 'audio2.mp3', startTime: 5, duration: 15 }
  ];

  it('should initialize with availableAudioTracks from options', () => {
    const helios = new Helios({
      duration: 30,
      fps: 30,
      availableAudioTracks: mockTracks
    });

    expect(helios.availableAudioTracks.value).toEqual(mockTracks);
    expect(helios.getState().availableAudioTracks).toEqual(mockTracks);
  });

  it('should initialize with empty array if availableAudioTracks is not provided', () => {
    const helios = new Helios({
      duration: 30,
      fps: 30
    });

    expect(helios.availableAudioTracks.value).toEqual([]);
  });

  it('should update availableAudioTracks via setAvailableAudioTracks', () => {
    const helios = new Helios({
      duration: 30,
      fps: 30
    });

    helios.setAvailableAudioTracks(mockTracks);

    expect(helios.availableAudioTracks.value).toEqual(mockTracks);
  });

  it('should allow DomDriver to override manually set tracks if it emits metadata', async () => {
    const mockDriver = {
      init: vi.fn(),
      update: vi.fn(),
      waitUntilStable: vi.fn().mockResolvedValue(undefined),
      subscribeToMetadata: vi.fn((callback) => {
        // Simulate driver emitting metadata later
        setTimeout(() => {
          callback({ audioTracks: [{ id: 'driver-track', src: 'driver.mp3', startTime: 0, duration: 5 }] });
        }, 10);
        return () => {};
      })
    };

    const helios = new Helios({
      duration: 30,
      fps: 30,
      driver: mockDriver as any,
      availableAudioTracks: mockTracks
    });

    // Initially it should be what we passed
    expect(helios.availableAudioTracks.value).toEqual(mockTracks);

    // Wait for driver to emit
    await new Promise<void>(resolve => setTimeout(resolve, 20));

    expect(helios.availableAudioTracks.value).toEqual([{ id: 'driver-track', src: 'driver.mp3', startTime: 0, duration: 5 }]);
  });
});
