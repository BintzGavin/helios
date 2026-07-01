import React, { useEffect } from 'react';
import { render, act, waitFor, renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StudioProvider, useStudio } from './StudioContext';

// Mock ToastContext
vi.mock('./ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }: any) => <div>{children}</div>
}));

// Mock Component to consume context and trigger snapshot
const TestComponent = ({ onReady }: { onReady: (context: any) => void }) => {
  const context = useStudio();
  useEffect(() => {
    onReady(context);
  }, [context, onReady]);
  return null;
};

describe('StudioContext', () => {
  let mockController: any;
  let mockFetch: any;

  beforeEach(() => {
    // Mock Fetch
    mockFetch = vi.fn(() => Promise.resolve({
        json: () => Promise.resolve([]),
        ok: true
    }));
    global.fetch = mockFetch;

    // Mock Controller
    mockController = {
      captureFrame: vi.fn(),
      seek: vi.fn(),
      play: vi.fn(),
      setLoop: vi.fn(),
      setPlaybackRange: vi.fn(),
      clearPlaybackRange: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('takeSnapshot calls controller.captureFrame and downloads image', async () => {
    let context: any;

    // Mock Canvas and Context
    const mockContext2D = {
      drawImage: vi.fn(),
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext2D),
      toDataURL: vi.fn(() => 'data:image/png;base64,fake'),
    };

    // Mock Anchor
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    // Mock document.createElement
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'canvas') return mockCanvas as any;
        if (tagName === 'a') return mockAnchor as any;
        return originalCreateElement.call(document, tagName);
    });

    // Mock VideoFrame
    const mockVideoFrame = {
        displayWidth: 1920,
        displayHeight: 1080,
        close: vi.fn(),
    };

    mockController.captureFrame.mockResolvedValue({ frame: mockVideoFrame });

    render(
      <StudioProvider>
        <TestComponent onReady={(ctx) => { context = ctx; }} />
      </StudioProvider>
    );

    // Wait for context to settle
    await waitFor(() => expect(context).toBeDefined());

    // Set controller
    act(() => {
      context.setController(mockController);
      context.setPlayerState((prev: any) => ({ ...prev, currentFrame: 42 }));
    });

    // Trigger snapshot
    await act(async () => {
      await context.takeSnapshot();
    });

    // Verify captureFrame called
    expect(mockController.captureFrame).toHaveBeenCalledWith(42, expect.objectContaining({ mode: 'canvas' }));

    // Verify canvas operations
    expect(mockCanvas.width).toBe(1920);
    expect(mockCanvas.height).toBe(1080);
    expect(mockContext2D.drawImage).toHaveBeenCalledWith(mockVideoFrame, 0, 0);
    expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');

    // Verify download
    expect(mockAnchor.href).toBe('data:image/png;base64,fake');
    expect(mockAnchor.download).toMatch(/snapshot-.*-42\.png/);
    expect(mockAnchor.click).toHaveBeenCalled();

    // Verify cleanup
    expect(mockVideoFrame.close).toHaveBeenCalled();

    // Restore createElement
    document.createElement = originalCreateElement;
  });

  describe('Loop Logic', () => {
    it('syncs loop state to controller', async () => {
      let context: any;

      render(
        <StudioProvider>
          <TestComponent onReady={(ctx) => { context = ctx; }} />
        </StudioProvider>
      );

      await waitFor(() => expect(context).toBeDefined());

      act(() => {
        context.setController(mockController);
      });

      // Enable loop
      act(() => {
        if (!context.loop) context.toggleLoop();
      });

      expect(mockController.setLoop).toHaveBeenCalledWith(true);

      // Disable loop
      act(() => {
        if (context.loop) context.toggleLoop();
      });

      expect(mockController.setLoop).toHaveBeenCalledWith(false);
    });

    it('syncs playback range to controller', async () => {
      let context: any;

      render(
        <StudioProvider>
          <TestComponent onReady={(ctx) => { context = ctx; }} />
        </StudioProvider>
      );

      await waitFor(() => expect(context).toBeDefined());

      act(() => {
        context.setController(mockController);
        context.setPlayerState((prev: any) => ({
          ...prev,
          duration: 10,
          fps: 30
        }));
      });

      // Set range
      act(() => {
        context.setInPoint(10);
        context.setOutPoint(50);
      });

      expect(mockController.setPlaybackRange).toHaveBeenCalledWith(10, 50);

      // Clear range (full duration)
      act(() => {
        context.setInPoint(0);
        context.setOutPoint(0);
      });

      expect(mockController.clearPlaybackRange).toHaveBeenCalled();
    });
  });

  describe('Timeline Persistence', () => {
    let getItemSpy: any;
    let setItemSpy: any;

    beforeEach(() => {
      getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('saves timeline state when inPoint/outPoint/loop changes', async () => {
      let context: any;

      render(
        <StudioProvider>
          <TestComponent onReady={(ctx) => { context = ctx; }} />
        </StudioProvider>
      );

      await waitFor(() => expect(context).toBeDefined());

      // Simulate active composition
      act(() => {
        context.setActiveComposition({ id: 'comp-1', name: 'Test', url: '' });
      });

      // Change inPoint
      act(() => {
        context.setInPoint(10);
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        'helios-studio:timeline:comp-1',
        expect.stringContaining('"inPoint":10')
      );
    });

    it('restores timeline state when composition loads', async () => {
      // Mock saved state
      getItemSpy.mockReturnValue(JSON.stringify({
        inPoint: 20,
        outPoint: 100,
        loop: true,
        frame: 50
      }));

      let context: any;

      render(
        <StudioProvider>
          <TestComponent onReady={(ctx) => { context = ctx; }} />
        </StudioProvider>
      );

      await waitFor(() => expect(context).toBeDefined());

      // Simulate setting active composition, which triggers loadTimelineState
      act(() => {
        context.setActiveComposition({ id: 'comp-2', name: 'Test 2', url: '' });
      });

      // Verify state restored
      await waitFor(() => {
        expect(context.inPoint).toBe(20);
        expect(context.outPoint).toBe(100);
        expect(context.loop).toBe(true);
      });

      // Verify pending seek handled when controller becomes available
      act(() => {
        context.setController(mockController);
      });

      await waitFor(() => {
        expect(mockController.seek).toHaveBeenCalledWith(50);
      });
    });
  });

  describe('Editor Integration', () => {
    it('openInEditor calls fetch with mapped url', async () => {
      let context: any;

      render(
        <StudioProvider>
          <TestComponent onReady={(ctx) => { context = ctx; }} />
        </StudioProvider>
      );

      await waitFor(() => expect(context).toBeDefined());

      act(() => {
        context.openInEditor('/@fs/my/file/path.ts');
      });

      expect(mockFetch).toHaveBeenCalledWith('/__open-in-editor?file=%2Fmy%2Ffile%2Fpath.ts');
    });

    it('openInEditor handles fetch error gracefully', async () => {
      let context: any;

      // Override the specific call in openInEditor to reject
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockImplementation((url: string) => {
        if (url.startsWith('/__open-in-editor')) {
            return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
            json: () => Promise.resolve([]),
            ok: true
        });
      });

      render(
        <StudioProvider>
          <TestComponent onReady={(ctx) => { context = ctx; }} />
        </StudioProvider>
      );

      await waitFor(() => expect(context).toBeDefined());

      act(() => {
        context.openInEditor('/my/file/path.ts');
      });

      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith('Failed to open in editor', expect.any(Error));
      });

      errorSpy.mockRestore();
    });
  });

  describe('useStudio hook', () => {
    it('throws error when used outside of StudioProvider', () => {
      // Suppress the expected error from React boundaries in test output
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useStudio());
      }).toThrow('useStudio must be used within a StudioProvider');

      errorSpy.mockRestore();
    });
  });

  describe('Render Config Persistence', () => {
    let getItemSpy: any;
    let setItemSpy: any;

    beforeEach(() => {
      getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
      setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('loads config from localStorage on init', async () => {
      getItemSpy.mockReturnValue(JSON.stringify({ mode: 'dom', videoBitrate: '2000k' }));

      let context: any;

      render(
        <StudioProvider>
          <TestComponent onReady={(ctx) => { context = ctx; }} />
        </StudioProvider>
      );

      await waitFor(() => expect(context).toBeDefined());

      expect(context.renderConfig).toEqual(expect.objectContaining({
        mode: 'dom',
        videoBitrate: '2000k'
      }));
    });

    it('saves config to localStorage on change', async () => {
      let context: any;

      render(
        <StudioProvider>
          <TestComponent onReady={(ctx) => { context = ctx; }} />
        </StudioProvider>
      );

      await waitFor(() => expect(context).toBeDefined());

      act(() => {
        context.setRenderConfig({ mode: 'canvas', videoCodec: 'vp9' });
      });

      expect(setItemSpy).toHaveBeenCalledWith(
        'helios-studio:render-config',
        JSON.stringify({ mode: 'canvas', videoCodec: 'vp9' })
      );
    });

    it('uses default config if localStorage is empty', async () => {
      getItemSpy.mockReturnValue(null);

      let context: any;

      render(
        <StudioProvider>
          <TestComponent onReady={(ctx) => { context = ctx; }} />
        </StudioProvider>
      );

      await waitFor(() => expect(context).toBeDefined());

      expect(context.renderConfig).toEqual({ mode: 'canvas' });
    });
  });

  describe('export functions', () => {
    it('cancels export if controller exists', async () => {
      let ctx: any;
      const TestComponent = () => {
        ctx = useStudio();
        return null;
      };

      render(

          <StudioProvider>
            <TestComponent />
          </StudioProvider>

      );

      await act(async () => {
        ctx.exportVideo('mp4');
      });

      await act(async () => {
        ctx.cancelExport();
      });
    });

    it('exports job spec successfully', async () => {
      let ctx: any;
      const TestComponent = () => {
        ctx = useStudio();
        return null;
      };

      render(

          <StudioProvider>
            <TestComponent />
          </StudioProvider>

      );

      // Set active composition
      await act(async () => {
        ctx.setActiveComposition({ url: 'http://test.com/comp', id: '1', name: 'Test' });
      });

      // Mock URL functions
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Spy on HTMLAnchorElement click instead of mocking the whole element
      const clickSpy = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      // Mock fetch for job spec
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(new Blob(['{}']))
      });

      await act(async () => {
        await ctx.exportJobSpec();
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('handles export job spec failure', async () => {
      let ctx: any;
      const TestComponent = () => {
        ctx = useStudio();
        return null;
      };

      render(

          <StudioProvider>
            <TestComponent />
          </StudioProvider>

      );

      await act(async () => {
        ctx.setActiveComposition({ url: 'http://test.com/comp', id: '1', name: 'Test' });
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' })
      });

      await act(async () => {
        await ctx.exportJobSpec();
      });

      // Test fetch failure catch block
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await act(async () => {
        await ctx.exportJobSpec();
      });
    });
  });
});
