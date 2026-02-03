import { describe, it, expect } from 'vitest';
import { Helios } from './Helios';

describe('Helios Audio State Persistence', () => {
  it('should initialize with provided audioTracks', () => {
    const audioTracks = {
      'track-1': { volume: 0.5, muted: true },
      'track-2': { volume: 1.0, muted: false }
    };

    const helios = new Helios({
      fps: 30,
      duration: 10,
      audioTracks
    });

    const state = helios.getState();
    expect(state.audioTracks).toEqual(audioTracks);
  });

  it('should default audioTracks to empty object if not provided', () => {
    const helios = new Helios({
      fps: 30,
      duration: 10
    });

    const state = helios.getState();
    expect(state.audioTracks).toEqual({});
  });

  it('should handle undefined audioTracks explicitly', () => {
    const helios = new Helios({
      fps: 30,
      duration: 10,
      audioTracks: undefined
    });

    const state = helios.getState();
    expect(state.audioTracks).toEqual({});
  });
});
