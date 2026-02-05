// @vitest-environment jsdom
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Stage } from './Stage';
import * as StudioContext from '../../context/StudioContext';
import * as PersistentHooks from '../../hooks/usePersistentState';

// Mock child components
vi.mock('./EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state">Empty State</div>
}));

vi.mock('./StageToolbar', () => ({
  StageToolbar: ({ zoom, onZoom }: any) => (
    <div data-testid="stage-toolbar">
      Toolbar
      <button onClick={() => onZoom(zoom + 0.1)}>ZoomIn</button>
    </div>
  )
}));

// Mock hooks
vi.mock('../../hooks/useKeyboardShortcut', () => ({
  useKeyboardShortcut: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock PersistentState to just behave like useState for tests
// We mock the module export directly
vi.mock('../../hooks/usePersistentState', () => ({
  usePersistentState: (key: string, initial: any) => React.useState(initial)
}));

describe('Stage', () => {
  const mockSetController = vi.fn();
  const mockSetCanvasSize = vi.fn();
  const mockSetSettingsOpen = vi.fn();
  const mockTakeSnapshot = vi.fn();

  const defaultContext = {
    setController: mockSetController,
    canvasSize: { width: 1000, height: 1000 },
    setCanvasSize: mockSetCanvasSize,
    playerState: {
      currentFrame: 10,
      isPlaying: true,
      inputProps: { foo: 'bar' },
      duration: 100,
      fps: 30
    },
    controller: null,
    takeSnapshot: mockTakeSnapshot,
    setSettingsOpen: mockSetSettingsOpen,
    activeComposition: {
        id: 'test-comp',
        metadata: { defaultProps: { test: 1 } }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(StudioContext, 'useStudio').mockReturnValue(defaultContext as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders EmptyState when no src provided', () => {
    render(<Stage src="" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(document.querySelector('helios-player')).not.toBeInTheDocument();
  });

  it('renders helios-player when src provided', () => {
    const { container } = render(<Stage src="test.js" />);
    const player = container.querySelector('helios-player');
    expect(player).toBeInTheDocument();
    expect(player).toHaveAttribute('src', 'test.js');
    expect(player).toHaveStyle({ width: '1000px', height: '1000px' });
  });

  it('handles zoom via Ctrl+Wheel', () => {
    const { container } = render(<Stage src="test.js" />);
    const stageContainer = container.firstChild as HTMLElement;

    // Initial zoom is 1. We scroll down (negative deltaY usually means up, but let's check implementation)
    // Implementation: const delta = -e.deltaY * 0.001;
    // So negative deltaY -> positive delta -> zoom in.

    fireEvent.wheel(stageContainer, {
      ctrlKey: true,
      deltaY: -100
    });

    // Zoom should increase. 1 + (-(-100) * 0.001) = 1 + 0.1 = 1.1
    // The content div has the transform
    const content = container.querySelector('.stage-content');
    expect(content).toHaveStyle('transform: translate(0px, 0px) scale(1.1)');
  });

  it('handles pan via Mouse Drag', () => {
    const { container } = render(<Stage src="test.js" />);
    const stageContainer = container.firstChild as HTMLElement;
    const content = container.querySelector('.stage-content');

    fireEvent.mouseDown(stageContainer, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(stageContainer, { clientX: 150, clientY: 150 });
    fireEvent.mouseUp(stageContainer);

    // Pan should be (150-100, 150-100) = (50, 50)
    expect(content).toHaveStyle('transform: translate(50px, 50px) scale(1)');
  });

  it('preserves and restores state on HMR (Controller change)', async () => {
    // 1. Initial Render with a Controller A
    const mockControllerA = {
      seek: vi.fn(),
      play: vi.fn(),
      setInputProps: vi.fn()
    };
    const mockControllerB = {
        seek: vi.fn(),
        play: vi.fn(),
        setInputProps: vi.fn()
    };

    // Need to setup context so it reflects having controller A initially,
    // BUT the component uses polling to find the controller from the DOM.
    // So actually, we start with null controller in context, let the component find it.

    // However, the test requirement is to verify "restoration".
    // Restoration logic depends on `lastStateRef`.
    // `lastStateRef` is updated via useEffect dependent on `playerState`.
    // So we need to render, let it update lastStateRef based on initial props.

    // Scenario:
    // 1. Render.
    // 2. Attach Controller A to DOM.
    // 3. Advance time -> setController(A) called.
    // 4. Update Context to reflect Controller A and some state (frame 10, playing).
    // 5. Rerender (useEffect updates lastStateRef).
    // 6. Simulate HMR: Attach Controller B to DOM.
    // 7. Advance time -> setController(B) called.
    // 8. Verify Controller B methods called with saved state.

    // Step 1: Render
    const { container, rerender } = render(<Stage src="test.js" />);
    const player = container.querySelector('helios-player') as any;

    // Step 2: Attach Controller A
    player.getController = () => mockControllerA;

    // Step 3: Advance time to trigger interval
    act(() => {
        vi.advanceTimersByTime(250);
    });

    // Expect setController to be called with A
    expect(mockSetController).toHaveBeenCalledWith(mockControllerA);

    // Step 4: Simulate Context Update (as if App updated state)
    // We update the mock return value and rerender
    const contextWithState = {
        ...defaultContext,
        controller: mockControllerA,
        playerState: {
            currentFrame: 10,
            isPlaying: true,
            inputProps: { foo: 'bar' },
            duration: 100,
            fps: 30
        }
    };
    vi.spyOn(StudioContext, 'useStudio').mockReturnValue(contextWithState as any);
    rerender(<Stage src="test.js" />);

    // Let useEffect run to update lastStateRef

    // Step 6: Simulate HMR - Controller changes to B
    // NOTE: In HMR, the component might be remounted or just the logic runs.
    // The interval keeps running or restarts.
    // We simulate the player element returning a NEW controller.
    player.getController = () => mockControllerB;

    // Step 7: Advance time
    act(() => {
        vi.advanceTimersByTime(250);
    });

    // Step 8: Verify restoration
    expect(mockSetController).toHaveBeenCalledWith(mockControllerB);

    // Controller B should be called with state from contextWithState
    expect(mockControllerB.seek).toHaveBeenCalledWith(10);
    expect(mockControllerB.play).toHaveBeenCalled();
    expect(mockControllerB.setInputProps).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('applies default props on fresh load', () => {
    const mockController = {
        seek: vi.fn(),
        play: vi.fn(),
        setInputProps: vi.fn()
    };

    const { container } = render(<Stage src="test.js" />);
    const player = container.querySelector('helios-player') as any;
    player.getController = () => mockController;

    act(() => {
        vi.advanceTimersByTime(250);
    });

    // Should apply default props from activeComposition
    expect(mockController.setInputProps).toHaveBeenCalledWith({ test: 1 });
  });
});
