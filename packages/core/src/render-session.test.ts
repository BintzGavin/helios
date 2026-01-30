import { describe, it, expect, vi } from 'vitest';
import { RenderSession } from './render-session.js';
import type { Helios } from './index.js';

describe('RenderSession', () => {
  it('should iterate through frames from start to end', async () => {
    const mockHelios = {
      seek: vi.fn(),
      waitUntilStable: vi.fn().mockResolvedValue(undefined),
    } as unknown as Helios;

    const session = new RenderSession(mockHelios, {
      startFrame: 0,
      endFrame: 2,
    });

    const frames: number[] = [];
    for await (const frame of session) {
      frames.push(frame);
    }

    expect(frames).toEqual([0, 1, 2]);
    expect(mockHelios.seek).toHaveBeenCalledTimes(3);
    expect(mockHelios.seek).toHaveBeenNthCalledWith(1, 0);
    expect(mockHelios.seek).toHaveBeenNthCalledWith(2, 1);
    expect(mockHelios.seek).toHaveBeenNthCalledWith(3, 2);
    expect(mockHelios.waitUntilStable).toHaveBeenCalledTimes(3);
  });

  it('should handle single frame range', async () => {
    const mockHelios = {
      seek: vi.fn(),
      waitUntilStable: vi.fn().mockResolvedValue(undefined),
    } as unknown as Helios;

    const session = new RenderSession(mockHelios, {
      startFrame: 5,
      endFrame: 5,
    });

    const frames: number[] = [];
    for await (const frame of session) {
      frames.push(frame);
    }

    expect(frames).toEqual([5]);
    expect(mockHelios.seek).toHaveBeenCalledWith(5);
  });

  it('should stop iteration when aborted via AbortSignal', async () => {
    const mockHelios = {
      seek: vi.fn(),
      waitUntilStable: vi.fn().mockResolvedValue(undefined),
    } as unknown as Helios;

    const controller = new AbortController();
    const session = new RenderSession(mockHelios, {
      startFrame: 0,
      endFrame: 10,
      abortSignal: controller.signal,
    });

    const frames: number[] = [];
    let count = 0;
    for await (const frame of session) {
      frames.push(frame);
      count++;
      if (count === 2) {
        controller.abort();
      }
    }

    // Should yield 0, 1. Then abort.
    expect(frames).toEqual([0, 1]);
    expect(mockHelios.seek).toHaveBeenCalledTimes(2);
  });

  it('should check for abort after waitUntilStable', async () => {
    const controller = new AbortController();
    const mockHelios = {
      seek: vi.fn(),
      waitUntilStable: vi.fn().mockImplementation(async () => {
        // Abort during wait
        controller.abort();
      }),
    } as unknown as Helios;

    const session = new RenderSession(mockHelios, {
      startFrame: 0,
      endFrame: 10,
      abortSignal: controller.signal,
    });

    const frames: number[] = [];
    for await (const frame of session) {
      frames.push(frame);
    }

    // Should yield nothing because it aborted during the first wait
    expect(frames).toEqual([]);
    expect(mockHelios.seek).toHaveBeenCalledTimes(1);
  });

  it('should not start if already aborted', async () => {
    const mockHelios = {
      seek: vi.fn(),
      waitUntilStable: vi.fn(),
    } as unknown as Helios;

    const controller = new AbortController();
    controller.abort();

    const session = new RenderSession(mockHelios, {
      startFrame: 0,
      endFrame: 10,
      abortSignal: controller.signal,
    });

    const frames: number[] = [];
    for await (const frame of session) {
      frames.push(frame);
    }

    expect(frames).toEqual([]);
    expect(mockHelios.seek).not.toHaveBeenCalled();
  });

  it('should throw error for invalid range', () => {
    const mockHelios = {} as unknown as Helios;

    expect(() => {
      new RenderSession(mockHelios, {
        startFrame: 10,
        endFrame: 5,
      });
    }).toThrow(/Invalid range/);
  });

  it('should throw error for negative startFrame', () => {
    const mockHelios = {} as unknown as Helios;

    expect(() => {
      new RenderSession(mockHelios, {
        startFrame: -1,
        endFrame: 5,
      });
    }).toThrow(/Invalid startFrame/);
  });
});
