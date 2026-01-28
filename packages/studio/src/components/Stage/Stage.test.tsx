import React from 'react';
import { render, act } from '@testing-library/react';
import { Stage } from './Stage';
import { useStudio } from '../../context/StudioContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock StudioContext
vi.mock('../../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

// Mock helios-player component behavior since we are in JSDOM
// We just need it to render a div or similar that we can attach properties to
// But Stage renders <helios-player>, so JSDOM will create an HTMLElement with that tag.

describe('Stage', () => {
  const setController = vi.fn();
  const setCanvasSize = vi.fn();
  const playerState = {
    currentFrame: 30,
    isPlaying: true,
    duration: 100,
    fps: 30,
    playbackRate: 1,
    inputProps: {}
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (useStudio as any).mockReturnValue({
      setController,
      canvasSize: { width: 1920, height: 1080 },
      setCanvasSize,
      playerState,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores state when controller changes (HMR)', () => {
    const { container } = render(<Stage src="test-src" />);

    // Find the helios-player element
    // In JSDOM, custom elements are just generic HTMLElements unless defined
    const playerEl: any = container.querySelector('helios-player');

    expect(playerEl).toBeTruthy();

    // Mock Controller 1
    const controller1 = {
      seek: vi.fn(),
      play: vi.fn(),
    };

    // Attach getController to the element
    playerEl.getController = () => controller1;

    // Advance time to trigger polling (initial connection)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should have connected to controller 1
    expect(setController).toHaveBeenCalledWith(controller1);

    // Clear mocks to verify next step cleanly
    controller1.seek.mockClear();
    controller1.play.mockClear();
    setController.mockClear();

    // Mock Controller 2 (HMR happened)
    const controller2 = {
      seek: vi.fn(),
      play: vi.fn(),
    };

    playerEl.getController = () => controller2;

    // Advance time to trigger polling
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Verify State Restoration on new controller
    // Should use the currentFrame from playerState (30)
    expect(controller2.seek).toHaveBeenCalledWith(30);
    // Should play because isPlaying was true
    expect(controller2.play).toHaveBeenCalled();
    // Should update context with new controller
    expect(setController).toHaveBeenCalledWith(controller2);
  });

  it('does not restore state on initial load', () => {
    const { container } = render(<Stage src="test-src-2" />);
    const playerEl: any = container.querySelector('helios-player');

    const controller1 = {
      seek: vi.fn(),
      play: vi.fn(),
    };
    playerEl.getController = () => controller1;

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Initial load should NOT seek/play automatically based on previous state
    // (Unless logic dictated otherwise, but here we only restore on CHANGE)
    // The code only restores if `knownControllerRef.current` was truthy.

    expect(controller1.seek).not.toHaveBeenCalled();
    expect(controller1.play).not.toHaveBeenCalled();
    expect(setController).toHaveBeenCalledWith(controller1);
  });
});
