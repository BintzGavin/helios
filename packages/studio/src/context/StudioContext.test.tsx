import React, { useEffect } from 'react';
import { render, act, waitFor } from '@testing-library/react';
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
});
