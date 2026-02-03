// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DomDriver } from './DomDriver.js';

describe('DomDriver Audio', () => {
  let driver: DomDriver;
  let mockAudioContext: any;
  let mockSourceNode: any;
  let mockCreateMediaElementSource: any;

  beforeEach(() => {
    // Mock AudioContext
    mockSourceNode = {
      connect: vi.fn(),
    };
    mockCreateMediaElementSource = vi.fn().mockReturnValue(mockSourceNode);
    mockAudioContext = {
      createMediaElementSource: mockCreateMediaElementSource,
      destination: {},
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Use a function that returns the mock object when called with new
    const MockAudioContext = function() {
        return mockAudioContext;
    };
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockAudioContext);

    // Mock Document features missing in JSDOM
    if (!document.fonts) {
      Object.defineProperty(document, 'fonts', {
        value: { ready: Promise.resolve() },
        writable: true
      });
    }
    if (!document.timeline) {
      Object.defineProperty(document, 'timeline', {
        value: { currentTime: 0 },
        writable: true
      });
    }

    driver = new DomDriver();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should lazy load AudioContext', async () => {
    expect((driver as any).audioContext).toBeNull();

    const ctx = await driver.getAudioContext();
    expect(ctx).toBe(mockAudioContext);
    expect((driver as any).audioContext).toBe(mockAudioContext);

    // Should return cached instance
    const ctx2 = await driver.getAudioContext();
    expect(ctx2).toBe(mockAudioContext);
  });

  it('should return null for AudioSourceNode if no track found', async () => {
    const scope = document.createElement('div');
    driver.init(scope);

    const source = await driver.getAudioSourceNode('non-existent');
    expect(source).toBeNull();
  });

  it('should return AudioSourceNode for found track', async () => {
    const scope = document.createElement('div');
    const audioEl = document.createElement('audio');
    audioEl.setAttribute('data-helios-track-id', 'test-track');
    scope.appendChild(audioEl);

    driver.init(scope);

    const source = await driver.getAudioSourceNode('test-track');
    expect(source).toBe(mockSourceNode);
    expect(mockCreateMediaElementSource).toHaveBeenCalledWith(audioEl);
    expect(mockSourceNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
  });

  it('should cache AudioSourceNode', async () => {
    const scope = document.createElement('div');
    const audioEl = document.createElement('audio');
    audioEl.setAttribute('data-helios-track-id', 'test-track');
    scope.appendChild(audioEl);

    driver.init(scope);

    const source1 = await driver.getAudioSourceNode('test-track');
    const source2 = await driver.getAudioSourceNode('test-track');

    expect(source1).toBe(source2);
    expect(mockCreateMediaElementSource).toHaveBeenCalledTimes(1);
  });

  it('should close AudioContext on dispose', async () => {
    await driver.getAudioContext();
    expect((driver as any).audioContext).toBe(mockAudioContext);

    driver.dispose();
    expect(mockAudioContext.close).toHaveBeenCalled();
    expect((driver as any).audioContext).toBeNull();
  });
});
