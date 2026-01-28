import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Helios } from './index.js';
import { TimeDriver } from './drivers/index.js';

describe('Helios Audio', () => {
  let mockDriver: TimeDriver;

  beforeEach(() => {
    mockDriver = {
      init: vi.fn(),
      update: vi.fn(),
      waitUntilStable: vi.fn().mockResolvedValue(undefined)
    };
  });

  it('should initialize with default volume (1) and muted (false)', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    expect(helios.getState().volume).toBe(1);
    expect(helios.getState().muted).toBe(false);
  });

  it('should initialize with provided volume and muted options', () => {
    const helios = new Helios({
      duration: 10,
      fps: 30,
      volume: 0.5,
      muted: true
    });
    expect(helios.getState().volume).toBe(0.5);
    expect(helios.getState().muted).toBe(true);
  });

  it('should update volume and sync driver', () => {
    const helios = new Helios({ duration: 10, fps: 30, driver: mockDriver });

    helios.setAudioVolume(0.8);
    expect(helios.getState().volume).toBe(0.8);
    expect(mockDriver.update).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
      volume: 0.8
    }));
  });

  it('should clamp volume between 0 and 1', () => {
    const helios = new Helios({ duration: 10, fps: 30 });

    helios.setAudioVolume(1.5);
    expect(helios.getState().volume).toBe(1);

    helios.setAudioVolume(-0.5);
    expect(helios.getState().volume).toBe(0);
  });

  it('should update muted state and sync driver', () => {
    const helios = new Helios({ duration: 10, fps: 30, driver: mockDriver });

    helios.setAudioMuted(true);
    expect(helios.getState().muted).toBe(true);
    expect(mockDriver.update).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
      muted: true
    }));
  });

  it('should expose reactive signals for volume and muted', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    const spy = vi.fn();

    // Subscribe to state changes (which are triggered by signal updates)
    helios.subscribe(spy);

    helios.setAudioVolume(0.5);
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ volume: 0.5 }));

    helios.setAudioMuted(true);
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ muted: true }));
  });

  it('should pass volume and muted to driver during playback', () => {
    const helios = new Helios({
      duration: 10,
      fps: 30,
      driver: mockDriver,
      volume: 0.7,
      muted: true
    });

    helios.play();
    expect(mockDriver.update).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({
      volume: 0.7,
      muted: true
    }));
  });
});
