import { describe, it, expect } from 'vitest';
import { HeliosConfig, HeliosComposition } from './types.js';
import { HeliosOptions, Helios } from './Helios.js';

describe('Helios Types', () => {
  it('should allow creating a valid HeliosConfig object', () => {
    const config: HeliosConfig = {
      width: 1920,
      height: 1080,
      duration: 10,
      fps: 30,
      loop: true,
      audioTracks: {
        'music': { volume: 0.5, muted: false }
      }
    };
    expect(config.width).toBe(1920);
    expect(config.audioTracks?.['music'].volume).toBe(0.5);
  });

  it('should allow creating a valid HeliosComposition object', () => {
    const composition: HeliosComposition = {
      width: 1280,
      height: 720,
      duration: 5,
      fps: 60,
      timeline: {
        tracks: [
          {
            id: 'video-track',
            clips: [
              {
                id: 'clip-1',
                source: 'video.mp4',
                start: 0,
                duration: 5
              }
            ]
          }
        ]
      }
    };
    expect(composition.timeline?.tracks[0].clips[0].source).toBe('video.mp4');
  });

  it('should ensure HeliosOptions extends HeliosConfig correctly', () => {
    const options: HeliosOptions = {
      width: 100,
      height: 100,
      duration: 1,
      fps: 1,
      // Extra option from HeliosOptions
      autoSyncAnimations: true
    };
    expect(options.autoSyncAnimations).toBe(true);
  });

  it('should allow passing HeliosConfig to Helios constructor (as options)', () => {
     const config: HeliosConfig = {
        width: 1920,
        height: 1080,
        duration: 10,
        fps: 30
     };

     // Helios constructor expects HeliosOptions, which extends HeliosConfig.
     const helios = new Helios(config);
     expect(helios.width.value).toBe(1920);
     expect(helios.duration.value).toBe(10);
  });
});
