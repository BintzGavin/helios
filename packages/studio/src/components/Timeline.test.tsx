import React from 'react';
import { render, screen, fireEvent, act, createEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Timeline } from './Timeline';
import * as StudioContext from '../context/StudioContext';

// Mock the context
vi.mock('../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('Timeline', () => {
  const mockSeek = vi.fn();
  const mockSetInPoint = vi.fn();
  const mockSetOutPoint = vi.fn();

  const defaultPlayerState = {
    currentFrame: 30, // 1 second
    duration: 10, // 10 seconds
    fps: 30,
    playbackRate: 1,
    isPlaying: false,
    inputProps: {},
    availableAudioTracks: [],
    audioTracks: {},
  };

  const defaultContext = {
    controller: {
      seek: mockSeek,
      getAudioTracks: vi.fn().mockResolvedValue([])
    },
    playerState: defaultPlayerState,
    inPoint: 0,
    setInPoint: mockSetInPoint,
    outPoint: 300, // 10s * 30fps
    setOutPoint: mockSetOutPoint,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders current time and markers correctly', () => {
    render(<Timeline />);

    // Check time display: 30 frames / 30 fps = 1.00s
    expect(screen.getByText(/00:00:01:00/)).toBeInTheDocument();

    // Check In/Out markers display
    expect(screen.getByText(/In: 0/)).toBeInTheDocument();
    expect(screen.getByText(/Out: 300/)).toBeInTheDocument();
    expect(screen.getByText(/Fr: 30/)).toBeInTheDocument();
  });

  it('renders zoom control', () => {
    render(<Timeline />);
    expect(screen.getByTitle('Zoom Timeline')).toBeInTheDocument();
  });

  it('seeks when clicking on the content', () => {
    const { container } = render(<Timeline />);
    const content = container.querySelector('.timeline-content');

    expect(content).toBeInTheDocument();

    if (content) {
      // Mock getBoundingClientRect
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 50,
        bottom: 50,
        right: 1000,
        x: 0,
        y: 0,
        toJSON: () => {}
      }));

      // Click at 50% (x=500) -> Frame 150 (300 total frames * 0.5)
      // defaultContext has 300 frames (10s * 30fps)
      fireEvent.mouseDown(content, { clientX: 500 });

      expect(mockSeek).toHaveBeenCalledWith(150);
    }
  });

  it('updates width when zoom changes', () => {
    const { container } = render(<Timeline />);
    const slider = screen.getByTitle('Zoom Timeline');
    const content = container.querySelector('.timeline-content');

    // Default zoom 0 -> width 100%
    expect(content).toHaveStyle('width: 100%');

    // Change zoom
    fireEvent.change(slider, { target: { value: '50' } });

    expect(content).not.toHaveStyle('width: 100%');

    const style = content?.getAttribute('style');
    expect(style).toContain('width:');
    expect(style).toMatch(/px/);
  });

  it('renders caption markers correctly positioned', () => {
      const captions = [
          { startTime: 0, endTime: 1000, text: 'Hello' },
          { startTime: 2000, endTime: 3000, text: 'World' }
      ];

      (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { ...defaultPlayerState, captions }
      });

      const { container } = render(<Timeline />);
      const markers = container.querySelectorAll('.timeline-caption-marker');

      expect(markers).toHaveLength(2);
      expect(markers[0]).toHaveAttribute('title', 'Hello');
      expect(markers[1]).toHaveAttribute('title', 'World');

      // Check vertical position (Lane 0 = 28px)
      // videoTrackTop = RULER_HEIGHT(24) + TRACK_GAP(4) = 28px
      expect(markers[0]).toHaveStyle('top: 28px');
  });

  it('renders composition markers correctly positioned', () => {
    const markers = [
      { id: 'm1', time: 1, label: 'Start', color: '#ff0000' },
      { id: 'm2', time: 5, label: 'Mid', color: '#00ff00' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, markers }
    });

    const { container } = render(<Timeline />);
    const renderedMarkers = container.querySelectorAll('.timeline-marker-comp');

    expect(renderedMarkers).toHaveLength(2);
    expect(renderedMarkers[0]).toHaveAttribute('title', 'Start (m1)');
    expect(renderedMarkers[1]).toHaveAttribute('title', 'Mid (m2)');

    // Check vertical position (Lane 0 = 28px)
    expect(renderedMarkers[0]).toHaveStyle('top: 28px');

    // Test click
    const marker = renderedMarkers[1];
    const event = createEvent.mouseDown(marker);
    event.stopPropagation = vi.fn();
    fireEvent(marker, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(mockSeek).toHaveBeenCalledWith(150); // 5s * 30fps = 150
  });

  it('renders audio tracks stacked vertically', () => {
    const availableAudioTracks = [
      { id: 'track1', startTime: 2, duration: 4 }, // Start 2s, End 6s
      { id: 'track2', startTime: 8, duration: 1 }  // Start 8s, End 9s
    ];

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: { ...defaultPlayerState, availableAudioTracks }
    });

    const { container } = render(<Timeline />);
    const tracks = container.querySelectorAll('.timeline-audio-track');

    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toHaveAttribute('title', 'Audio: track1');
    expect(tracks[1]).toHaveAttribute('title', 'Audio: track2');

    // Check Track 1 (Lane 1)
    // Top = VideoTop(28) + TrackHeight(24) + Gap(4) = 56px
    const style1 = tracks[0].getAttribute('style');
    expect(style1).toContain('left: 20%');
    expect(style1).toContain('width: 40%');
    expect(style1).toContain('top: 56px');

    // Check Track 2 (Lane 2)
    // Top = 56 + 24 + 4 = 84px
    const style2 = tracks[1].getAttribute('style');
    expect(style2).toContain('top: 84px');
  });

  it('allows dragging time prop markers', () => {
    const setInputPropsMock = vi.fn();
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        ...defaultPlayerState,
        schema: {
          myTime: { type: 'number', format: 'time', label: 'My Time' }
        },
        inputProps: {
          myTime: 2.0 // Frame 60
        }
      },
      controller: {
        ...defaultContext.controller,
        setInputProps: setInputPropsMock
      }
    });

    const { container } = render(<Timeline />);
    const propMarker = container.querySelector('.timeline-marker-prop');
    expect(propMarker).toBeInTheDocument();
    expect(propMarker).toHaveAttribute('title', 'My Time (00:00:02:00)');
    expect(propMarker).toHaveStyle('left: 20%'); // 2s / 10s = 20%

    // Mock content rect for drag calculation
    const content = container.querySelector('.timeline-content');
    if (content) {
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0, top: 0, width: 1000, height: 100, bottom: 100, right: 1000, x: 0, y: 0, toJSON: () => {}
      }));
    }

    // Mouse down on marker
    fireEvent.mouseDown(propMarker!, { bubbles: true });

    // Mouse move on document (dragging to 50% -> 5s)
    act(() => {
      const moveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 500 // 50% of 1000px
      });
      document.dispatchEvent(moveEvent);
    });

    // Should call setInputProps with new time
    // 50% of 10s = 5s
    expect(setInputPropsMock).toHaveBeenCalledWith({ myTime: 5 });

    // Mouse up to clear draggingPropKey
    act(() => {
      const upEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(upEvent);
    });
  });

  it('handles asset drop correctly', () => {
    const setInputPropsMock = vi.fn();
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        ...defaultPlayerState,
        schema: {
          myVideo: { type: 'video', label: 'My Video' },
          myVideoTime: { type: 'number', format: 'time' }
        },
        inputProps: {}
      },
      controller: {
        ...defaultContext.controller,
        setInputProps: setInputPropsMock
      }
    });

    const { container } = render(<Timeline />);
    const content = container.querySelector('.timeline-content');
    expect(content).toBeInTheDocument();

    if (content) {
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0, top: 0, width: 1000, height: 100, bottom: 100, right: 1000, x: 0, y: 0, toJSON: () => {}
      }));
    }

    const mockAsset = {
      id: 'asset1',
      name: 'test.mp4',
      url: 'assets/test.mp4',
      type: 'video'
    };

    const dropEvent = createEvent.drop(content!);
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: vi.fn((key) => key === 'application/helios-asset' ? JSON.stringify(mockAsset) : null)
      }
    });
    Object.defineProperty(dropEvent, 'clientX', { value: 500 }); // 50% of 10s = 5s

    fireEvent(content!, dropEvent);

    expect(setInputPropsMock).toHaveBeenCalledWith({
      myVideo: 'assets/test.mp4',
      myVideoTime: 5
    });
  });

  it('shows hover guide when moving mouse over track area', () => {
    const { container } = render(<Timeline />);
    const content = container.querySelector('.timeline-content');

    if (content) {
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0, top: 0, width: 1000, height: 100, bottom: 100, right: 1000, x: 0, y: 0, toJSON: () => {}
      }));
    }

    expect(container.querySelector('.timeline-hover-guide')).not.toBeInTheDocument();

    // Mouse move to 50%
    fireEvent.mouseMove(content!, { clientX: 500, bubbles: true });

    // Hover guide should show 5s -> 00:00:05:00
    const hoverGuide = container.querySelector('.timeline-hover-guide');
    expect(hoverGuide).toBeInTheDocument();
    expect(hoverGuide).toHaveTextContent('00:00:05:00');

    // Mouse leave
    fireEvent.mouseLeave(content!, { bubbles: true });

    // Hover guide should disappear
    expect(container.querySelector('.timeline-hover-guide')).not.toBeInTheDocument();
  });

  it('allows dragging In and Out markers', () => {
    const { container } = render(<Timeline />);

    const content = container.querySelector('.timeline-content');
    if (content) {
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0, top: 0, width: 1000, height: 100, bottom: 100, right: 1000, x: 0, y: 0, toJSON: () => {}
      }));
    }

    const inMarker = container.querySelector('.timeline-marker.in');
    const outMarker = container.querySelector('.timeline-marker.out');

    expect(inMarker).toBeInTheDocument();
    expect(outMarker).toBeInTheDocument();

    // Mouse down on In marker
    fireEvent.mouseDown(inMarker!, { bubbles: true });

    // Drag to 50% -> frame 150
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 500 }));
    });

    expect(mockSetInPoint).toHaveBeenCalledWith(150);

    // Mouse up
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    });

    // Mouse down on Out marker
    fireEvent.mouseDown(outMarker!, { bubbles: true });

    // Drag to 80% -> frame 240
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 800 }));
    });

    expect(mockSetOutPoint).toHaveBeenCalledWith(240);

    // Mouse up
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    });
  });

  it('bounds dragged markers correctly', () => {
    // Current outPoint is 300, current inPoint is 0
    const { container } = render(<Timeline />);

    const content = container.querySelector('.timeline-content');
    if (content) {
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0, top: 0, width: 1000, height: 100, bottom: 100, right: 1000, x: 0, y: 0, toJSON: () => {}
      }));
    }

    const inMarker = container.querySelector('.timeline-marker.in');
    const outMarker = container.querySelector('.timeline-marker.out');

    // Drag In past Out (current out = 300) -> should clamp to outPoint - 1 = 299
    fireEvent.mouseDown(inMarker!, { bubbles: true });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 1100 })); // past 100%
    });
    expect(mockSetInPoint).toHaveBeenCalledWith(299);
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    });

    // Drag Out before In (current in = 0) -> should clamp to inPoint + 1 = 1
    fireEvent.mouseDown(outMarker!, { bubbles: true });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: -100 })); // before 0%
    });
    expect(mockSetOutPoint).toHaveBeenCalledWith(1);
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    });
  });

  it('seeks when dragging playhead', () => {
    const { container } = render(<Timeline />);

    const content = container.querySelector('.timeline-content');
    if (content) {
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0, top: 0, width: 1000, height: 100, bottom: 100, right: 1000, x: 0, y: 0, toJSON: () => {}
      }));
    }

    // Playhead dragging is triggered by mouseDown on the content area
    fireEvent.mouseDown(content!, { clientX: 500, bubbles: true }); // Frame 150
    expect(mockSeek).toHaveBeenCalledWith(150);

    // Move mouse
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 250 })); // 25% -> 75
    });
    expect(mockSeek).toHaveBeenCalledWith(75);

    // Mouse up
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    });
  });

  it('handles shift key snapping during playhead drag', () => {
    const { container } = render(<Timeline />);

    const content = container.querySelector('.timeline-content');
    if (content) {
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0, top: 0, width: 1000, height: 100, bottom: 100, right: 1000, x: 0, y: 0, toJSON: () => {}
      }));
    }

    fireEvent.mouseDown(content!, { clientX: 500, bubbles: true });
    mockSeek.mockClear();

    act(() => {
      const event = new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 505 });
      Object.defineProperty(event, 'shiftKey', { value: true });
      document.dispatchEvent(event);
    });

    // 505px is 50.5%, 300 * 0.505 = 151.5.
    // Wait, getSnapFrame logic is tested, shiftKey bypasses snapping.
    expect(mockSeek).toHaveBeenCalledWith(152); // Math.round(151.5) = 152

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    });
  });

  it('handles audio asset drop correctly', () => {
    const setInputPropsMock = vi.fn();
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        ...defaultPlayerState,
        schema: {
          myAudio: { type: 'audio', label: 'My Audio' },
          myAudioTime: { type: 'number', format: 'time' }
        },
        inputProps: {}
      },
      controller: {
        ...defaultContext.controller,
        setInputProps: setInputPropsMock
      }
    });

    const { container } = render(<Timeline />);
    const content = container.querySelector('.timeline-content');

    if (content) {
      content.getBoundingClientRect = vi.fn(() => ({
        left: 0, top: 0, width: 1000, height: 100, bottom: 100, right: 1000, x: 0, y: 0, toJSON: () => {}
      }));
    }

    const mockAsset = {
      id: 'asset2',
      name: 'test.mp3',
      url: 'assets/test.mp3',
      type: 'audio'
    };

    const dropEvent = createEvent.drop(content!);
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        getData: vi.fn((key) => key === 'application/helios-asset' ? JSON.stringify(mockAsset) : null)
      }
    });
    Object.defineProperty(dropEvent, 'clientX', { value: 250 }); // 25% of 10s = 2.5s

    fireEvent(content!, dropEvent);

    expect(setInputPropsMock).toHaveBeenCalledWith({
      myAudio: 'assets/test.mp3',
      myAudioTime: 2.5
    });
  });
});
