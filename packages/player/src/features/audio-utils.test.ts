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
        gain: { value: 1 },
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

      expect(mockSource.start).toHaveBeenCalledWith(2.5);
    });

    it('should default startTime to 0', async () => {
        const assets = [{
          buffer: new ArrayBuffer(8),
          mimeType: 'audio/mpeg'
        }];

        await mixAudio(assets, 10, 44100);

        expect(mockSource.start).toHaveBeenCalledWith(0);
      });
  });
});
