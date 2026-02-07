import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioFader } from './audio-fader';
import { SharedAudioContextManager } from './audio-context-manager';

// Mock SharedAudioContextManager
vi.mock('./audio-context-manager', () => {
  const mockSharedSource = {
    setFadeGain: vi.fn(),
  };

  const mockManager = {
    context: {
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
    },
    getSharedSource: vi.fn().mockReturnValue(mockSharedSource),
  };

  return {
    SharedAudioContextManager: {
      getInstance: vi.fn().mockReturnValue(mockManager),
    },
    SharedAudioSource: vi.fn(),
  };
});

describe('AudioFader', () => {
  let fader: AudioFader;
  let mockManager: any;
  let mockSharedSource: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockManager = SharedAudioContextManager.getInstance();
    mockSharedSource = mockManager.getSharedSource(document.createElement('audio')); // Use getSharedSource to get the mock source
    vi.clearAllMocks(); // Clear calls from setup

    fader = new AudioFader();

    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(cb, 0));
    vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
  });

  afterEach(() => {
    fader.dispose();
    vi.unstubAllGlobals();
  });

  it('should scan for audio elements with fade attributes', () => {
    const doc = document.implementation.createHTMLDocument();
    const audio1 = doc.createElement('audio');
    audio1.setAttribute('data-helios-fade-in', '2');
    doc.body.appendChild(audio1);

    const audio2 = doc.createElement('audio'); // No fade
    doc.body.appendChild(audio2);

    fader.connect(doc);

    expect(mockManager.getSharedSource).toHaveBeenCalledWith(audio1);
    expect(mockManager.getSharedSource).not.toHaveBeenCalledWith(audio2);
  });

  it('should calculate fade-in gain correctly', async () => {
    const doc = document.implementation.createHTMLDocument();
    const audio = doc.createElement('audio');
    audio.setAttribute('data-helios-fade-in', '2'); // 2s fade in
    doc.body.appendChild(audio);

    // Mock properties
    Object.defineProperty(audio, 'duration', { value: 10, writable: true });
    Object.defineProperty(audio, 'currentTime', { value: 1, writable: true }); // 50% fade in

    fader.connect(doc);
    fader.enable();

    // Wait for RAF
    await new Promise(r => setTimeout(r, 10));

    expect(mockSharedSource.setFadeGain).toHaveBeenCalledWith(0.5);
  });

  it('should calculate fade-out gain correctly', async () => {
    const doc = document.implementation.createHTMLDocument();
    const audio = doc.createElement('audio');
    audio.setAttribute('data-helios-fade-out', '2'); // 2s fade out
    doc.body.appendChild(audio);

    // Mock properties
    Object.defineProperty(audio, 'duration', { value: 10, writable: true });
    Object.defineProperty(audio, 'currentTime', { value: 9, writable: true }); // 1s remaining (50% fade out)

    fader.connect(doc);
    fader.enable();

    await new Promise(r => setTimeout(r, 10));

    expect(mockSharedSource.setFadeGain).toHaveBeenCalledWith(0.5);
  });

  it('should handle overlapping fade-in and fade-out', async () => {
    const doc = document.implementation.createHTMLDocument();
    const audio = doc.createElement('audio');
    audio.setAttribute('data-helios-fade-in', '4');
    audio.setAttribute('data-helios-fade-out', '4');
    doc.body.appendChild(audio);

    // Mock properties
    Object.defineProperty(audio, 'duration', { value: 6, writable: true });
    // Middle point (3s):
    // Fade In: 3/4 = 0.75
    // Fade Out: (6-3)/4 = 3/4 = 0.75
    Object.defineProperty(audio, 'currentTime', { value: 3, writable: true });

    fader.connect(doc);
    fader.enable();

    await new Promise(r => setTimeout(r, 10));

    expect(mockSharedSource.setFadeGain).toHaveBeenCalledWith(0.75);
  });

  it('should set gain to 1 when outside fade zones', async () => {
    const doc = document.implementation.createHTMLDocument();
    const audio = doc.createElement('audio');
    audio.setAttribute('data-helios-fade-in', '1');
    doc.body.appendChild(audio);

    // Mock properties
    Object.defineProperty(audio, 'duration', { value: 10, writable: true });
    Object.defineProperty(audio, 'currentTime', { value: 5, writable: true });

    fader.connect(doc);
    fader.enable();

    await new Promise(r => setTimeout(r, 10));

    expect(mockSharedSource.setFadeGain).toHaveBeenCalledWith(1);
  });

  it('should track dynamically added audio elements', async () => {
    const doc = document.implementation.createHTMLDocument();
    fader.connect(doc);

    const audio = doc.createElement('audio');
    audio.setAttribute('data-helios-fade-in', '2');
    doc.body.appendChild(audio);

    // Wait for MutationObserver callback
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockManager.getSharedSource).toHaveBeenCalledWith(audio);
  });

  it('should stop tracking removed audio elements', async () => {
    const doc = document.implementation.createHTMLDocument();
    const audio = doc.createElement('audio');
    audio.setAttribute('data-helios-fade-in', '2');
    doc.body.appendChild(audio);

    fader.connect(doc);
    fader.enable();

    // Verify it's being tracked (check if setFadeGain is called in loop)
    // We need to set mock properties to trigger a gain calculation
    Object.defineProperty(audio, 'duration', { value: 10, writable: true });
    Object.defineProperty(audio, 'currentTime', { value: 1, writable: true }); // 0.5 gain

    await new Promise(r => setTimeout(r, 10)); // Run loop
    expect(mockSharedSource.setFadeGain).toHaveBeenCalled();
    mockSharedSource.setFadeGain.mockClear();

    // Remove element
    doc.body.removeChild(audio);

    // Wait for MutationObserver callback
    await new Promise(resolve => setTimeout(resolve, 10));

    // Run loop again
    await new Promise(r => setTimeout(r, 10));

    // Should not be called anymore because it was removed from sources
    expect(mockSharedSource.setFadeGain).not.toHaveBeenCalled();
  });
});
