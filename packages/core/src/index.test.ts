import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Helios } from './index';

describe('Helios Core', () => {
  it('should initialize with correct state', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    expect(helios.getState()).toEqual({
      duration: 10,
      fps: 30,
      currentFrame: 0,
      isPlaying: false,
    });
  });

  it('should update state on seek', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    helios.seek(150);
    expect(helios.getState().currentFrame).toBe(150);
  });

  it('should clamp frames on seek', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    helios.seek(500); // Max is 300
    expect(helios.getState().currentFrame).toBe(300);

    helios.seek(-10);
    expect(helios.getState().currentFrame).toBe(0);
  });

  it('should notify subscribers', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    const spy = vi.fn();
    helios.subscribe(spy);

    // Initial call
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ currentFrame: 0 }));

    helios.seek(10);
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ currentFrame: 10 }));
  });

  describe('Document Timeline Binding', () => {
    beforeEach(() => {
        // Mock document.timeline
        vi.stubGlobal('document', {
            timeline: {
                currentTime: 0
            }
        });
        vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(cb, 0));
        vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should sync state from document.timeline when bound', async () => {
        const helios = new Helios({ duration: 10, fps: 30 });
        helios.bindToDocumentTimeline();

        // Simulate time passing in document.timeline
        (document.timeline as any).currentTime = 1000; // 1 second

        // Wait for polling loop
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(helios.getState().currentFrame).toBe(30); // 1s * 30fps

        (document.timeline as any).currentTime = 2000; // 2 seconds

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(helios.getState().currentFrame).toBe(60);

        helios.unbindFromDocumentTimeline();
    });
  });

  describe('WAAPI Synchronization', () => {
    beforeEach(() => {
        vi.stubGlobal('document', {
            getAnimations: vi.fn().mockReturnValue([]),
            timeline: { currentTime: 0 }
        });
        vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(cb, 0));
        vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should sync DOM animations when autoSyncAnimations is true', () => {
        const mockAnim = { currentTime: 0, playState: 'running', pause: vi.fn() };
        (document.getAnimations as any).mockReturnValue([mockAnim]);

        const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: true });

        // Seek to 1 second (frame 30)
        helios.seek(30);

        expect(mockAnim.currentTime).toBe(1000);
        expect(mockAnim.pause).toHaveBeenCalled();
    });

    it('should NOT sync DOM animations when autoSyncAnimations is false', () => {
        const mockAnim = { currentTime: 0, playState: 'running', pause: vi.fn() };
        (document.getAnimations as any).mockReturnValue([mockAnim]);

        const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: false });

        helios.seek(30);

        expect(mockAnim.currentTime).toBe(0);
        expect(mockAnim.pause).not.toHaveBeenCalled();
    });

    it('should sync DOM animations during playback', async () => {
        const mockAnim = { currentTime: 0, playState: 'running', pause: vi.fn() };
        (document.getAnimations as any).mockReturnValue([mockAnim]);

        const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: true });

        helios.play();

        // Wait for one tick
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockAnim.currentTime).toBeGreaterThan(0);
        expect(mockAnim.pause).toHaveBeenCalled();

        helios.pause();
    });

    it('should gracefully handle missing getAnimations API', () => {
        // Mock document without getAnimations
        vi.stubGlobal('document', {
            // getAnimations is undefined
            timeline: { currentTime: 0 }
        });

        const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: true });

        // Should not throw
        expect(() => helios.seek(30)).not.toThrow();
    });

    it('should respect animationScope if provided', () => {
        const mockScope = {
            getAnimations: vi.fn().mockReturnValue([])
        };
        const mockAnim = { currentTime: 0, playState: 'running', pause: vi.fn() };
        mockScope.getAnimations.mockReturnValue([mockAnim]);

        const helios = new Helios({
            duration: 10,
            fps: 30,
            autoSyncAnimations: true,
            animationScope: mockScope as any
        });

        helios.seek(30);

        expect(mockScope.getAnimations).toHaveBeenCalledWith({ subtree: true });
        expect((document.getAnimations as any)).not.toHaveBeenCalled();
        expect(mockAnim.currentTime).toBe(1000);
    });
  });
});
