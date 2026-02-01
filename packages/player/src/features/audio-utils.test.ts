// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAudioAssets, mixAudio } from './audio-utils';

describe('audio-utils', () => {
  describe('getAudioAssets', () => {
    beforeEach(() => {
      // Mock global fetch
      global.fetch = vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'audio/mpeg' }
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should parse basic audio attributes', async () => {
      document.body.innerHTML = `
        <audio src="test.mp3" volume="0.5"></audio>
      `;
      const assets = await getAudioAssets(document);
      expect(assets).toHaveLength(1);
      expect(assets[0].volume).toBe(0.5);
      expect(assets[0].muted).toBe(false);
    });

    it('should parse loop attribute', async () => {
      document.body.innerHTML = `
        <audio src="loop.mp3" loop></audio>
        <audio src="once.mp3"></audio>
      `;
      const assets = await getAudioAssets(document);
      expect(assets).toHaveLength(2);
      expect(assets[0].loop).toBe(true);
      expect(assets[1].loop).toBe(false);
    });

    it('should parse data-start-time attribute', async () => {
      document.body.innerHTML = `
        <audio src="delayed.mp3" data-start-time="1.5"></audio>
        <audio src="immediate.mp3"></audio>
        <audio src="invalid.mp3" data-start-time="abc"></audio>
      `;
      const assets = await getAudioAssets(document);
      expect(assets).toHaveLength(3);
      expect(assets[0].startTime).toBe(1.5);
      expect(assets[1].startTime).toBe(0); // Default
      expect(assets[2].startTime).toBe(0); // Fallback on invalid
    });

    it('should extract IDs with correct priority', async () => {
      document.body.innerHTML = `
        <audio src="track1.mp3" data-helios-track-id="custom-id"></audio>
        <audio src="track2.mp3" id="dom-id"></audio>
        <audio src="track3.mp3"></audio>
      `;
      const assets = await getAudioAssets(document);
      expect(assets).toHaveLength(3);
      expect(assets[0].id).toBe('custom-id');
      expect(assets[1].id).toBe('dom-id');
      expect(assets[2].id).toBe('track-2'); // index 2
    });

    it('should prioritize data-helios-track-id over id attribute', async () => {
      document.body.innerHTML = `
        <audio src="track1.mp3" data-helios-track-id="priority-id" id="ignored-id"></audio>
      `;
      const assets = await getAudioAssets(document);
      expect(assets).toHaveLength(1);
      expect(assets[0].id).toBe('priority-id');
    });

    it('should parse fade attributes', async () => {
      document.body.innerHTML = `
        <audio src="fades.mp3" data-helios-fade-in="0.5" data-helios-fade-out="1.5"></audio>
        <audio src="nofades.mp3"></audio>
        <audio src="invalid.mp3" data-helios-fade-in="abc"></audio>
      `;
      const assets = await getAudioAssets(document);
      expect(assets).toHaveLength(3);

      expect(assets[0].fadeInDuration).toBe(0.5);
      expect(assets[0].fadeOutDuration).toBe(1.5);

      expect(assets[1].fadeInDuration).toBe(0);
      expect(assets[1].fadeOutDuration).toBe(0);

      expect(assets[2].fadeInDuration).toBe(0);
    });
  });

  describe('mixAudio', () => {
    let mockContext: any;
    let mockSource: any;
    let mockGain: any;

    beforeEach(() => {
      mockSource = {
        buffer: null,
        loop: false,
        start: vi.fn(),
        connect: vi.fn(),
      };

      mockGain = {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn()
        },
        connect: vi.fn(),
      };

      mockContext = {
        decodeAudioData: vi.fn().mockResolvedValue({}),
        createBufferSource: vi.fn().mockReturnValue(mockSource),
        createGain: vi.fn().mockReturnValue(mockGain),
        startRendering: vi.fn().mockResolvedValue({}),
        destination: {},
      };

      // Mock OfflineAudioContext globally
      global.OfflineAudioContext = class {
        constructor() { return mockContext; }
      } as any;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should apply loop property to buffer source', async () => {
      const assets = [{
        buffer: new ArrayBuffer(8),
        mimeType: 'audio/mpeg',
        loop: true
      }];

      await mixAudio(assets, 10, 44100);

      expect(mockSource.loop).toBe(true);
    });

    it('should apply default loop property (false)', async () => {
        const assets = [{
          buffer: new ArrayBuffer(8),
          mimeType: 'audio/mpeg'
        }];

        await mixAudio(assets, 10, 44100);

        expect(mockSource.loop).toBe(false);
      });

    it('should apply startTime to source.start()', async () => {
      const assets = [{
        buffer: new ArrayBuffer(8),
        mimeType: 'audio/mpeg',
        startTime: 2.5
      }];

      await mixAudio(assets, 10, 44100);

      expect(mockSource.start).toHaveBeenCalledWith(2.5, 0);
    });

    it('should default startTime to 0', async () => {
        const assets = [{
          buffer: new ArrayBuffer(8),
          mimeType: 'audio/mpeg'
        }];

        await mixAudio(assets, 10, 44100);

        expect(mockSource.start).toHaveBeenCalledWith(0, 0);
    });

    it('should offset playback by rangeStart when asset starts after range', async () => {
      const assets = [{
        buffer: new ArrayBuffer(8),
        mimeType: 'audio/mpeg',
        startTime: 5.0
      }];
      // Export window starts at 2.0
      await mixAudio(assets, 10, 44100, 2.0);

      // Should start at 5.0 - 2.0 = 3.0 relative to buffer
      expect(mockSource.start).toHaveBeenCalledWith(3.0, 0);
    });

    it('should skip beginning of asset if it starts before range', async () => {
      const assets = [{
        buffer: new ArrayBuffer(8),
        mimeType: 'audio/mpeg',
        startTime: 1.0
      }];
      // Export window starts at 3.0
      await mixAudio(assets, 10, 44100, 3.0);

      // Asset starts at 1.0. Range starts at 3.0.
      // We are 2.0 seconds into the asset when the range starts.
      // playbackStart should be 0 (play immediately at start of range)
      // offset should be 2.0 (skip first 2 seconds of audio)
      expect(mockSource.start).toHaveBeenCalledWith(0, 2.0);
    });

    it('should schedule fade automation', async () => {
      const assets = [{
        buffer: new ArrayBuffer(8), // approx 0s duration but mocked duration is different usually?
        mimeType: 'audio/mpeg',
        startTime: 2.0,
        volume: 0.8,
        fadeInDuration: 1.0,
        fadeOutDuration: 1.0
      }];

      // Mock duration of buffer
      // OfflineAudioContext needs real decoding or mocks.
      mockContext.decodeAudioData = vi.fn().mockResolvedValue({
        duration: 10.0
      });

      // Export window starts at 0.0
      await mixAudio(assets, 20, 44100, 0.0);

      // Asset starts at 2.0.
      // Fade In:
      // Start at 2.0 with vol 0.
      // Ramp to 0.8 at 3.0.
      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 2.0);
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.8, 3.0);

      // Fade Out:
      // Ends at 2.0 + 10.0 = 12.0.
      // Fade out start: 12.0 - 1.0 = 11.0.
      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 11.0);
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 12.0);
    });
  });
});
