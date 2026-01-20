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

  describe('Auto Sync Animations', () => {
      beforeEach(() => {
          vi.stubGlobal('document', {
              getAnimations: vi.fn().mockReturnValue([]),
          });
      });

      afterEach(() => {
          vi.unstubAllGlobals();
      });

      it('should sync animations on seek', () => {
          const pauseSpy = vi.fn();
          const animationMock = {
              pause: pauseSpy,
              currentTime: 0
          };
          vi.stubGlobal('document', {
              getAnimations: vi.fn().mockReturnValue([animationMock]),
          });

          const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: true });
          helios.seek(30); // 1 second

          expect(pauseSpy).toHaveBeenCalled();
          expect(animationMock.currentTime).toBe(1000);
      });

      it('should sync animations on tick', async () => {
          const pauseSpy = vi.fn();
          const animationMock = {
              pause: pauseSpy,
              currentTime: 0
          };
          vi.stubGlobal('document', {
              getAnimations: vi.fn().mockReturnValue([animationMock]),
          });

          // We need a controllable requestAnimationFrame
          let rafCallback: FrameRequestCallback | null = null;
          vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
              rafCallback = cb;
              return 1;
          });
          vi.stubGlobal('cancelAnimationFrame', () => {});

          const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: true });
          helios.play();

          // Trigger one tick manually
          if (rafCallback) {
              (rafCallback as any)(performance.now());
          }

          expect(pauseSpy).toHaveBeenCalled();
          // Frame 1 is roughly 33.33ms (1000/30)
          expect(animationMock.currentTime).toBeCloseTo(33.33, 1);

          helios.pause();
      });
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
});
