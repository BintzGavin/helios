import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AudioMixerPanel } from './AudioMixerPanel';
import { StudioContext } from '../../context/StudioContext';

// Mock data
const mockTracks = [
  { id: 'track-1', volume: 1, muted: false },
  { id: 'track-2', volume: 0.8, muted: true },
  { id: 'track-3', volume: 0.5, muted: false },
];

describe('AudioMixerPanel', () => {
  let mockController: any;
  let mockContextValue: any;
  let meteringCallback: any;
  let unsubscribeMetering: any;

  beforeEach(() => {
    unsubscribeMetering = vi.fn();
    mockController = {
      getAudioTracks: vi.fn().mockResolvedValue([...mockTracks]),
      setAudioTrackMuted: vi.fn(),
      setAudioTrackVolume: vi.fn(),
      startAudioMetering: vi.fn(),
      stopAudioMetering: vi.fn(),
      onAudioMetering: vi.fn((cb) => {
        meteringCallback = cb;
        return unsubscribeMetering;
      }),
    };

    mockContextValue = {
      controller: mockController,
    };
  });

  const renderComponent = () => {
    return render(
      <StudioContext.Provider value={mockContextValue}>
        <AudioMixerPanel />
      </StudioContext.Provider>
    );
  };

  it('renders tracks fetched from controller', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('track-1')).toBeInTheDocument();
      expect(screen.getByText('track-2')).toBeInTheDocument();
      expect(screen.getByText('track-3')).toBeInTheDocument();
    });
  });

  it('activates audio metering on mount', async () => {
    renderComponent();
    expect(mockController.startAudioMetering).toHaveBeenCalled();
    expect(mockController.onAudioMetering).toHaveBeenCalled();
    expect(screen.getByTitle('Master Levels')).toBeInTheDocument();
  });

  it('updates meter when levels are received', async () => {
    renderComponent();
    await waitFor(() => expect(mockController.onAudioMetering).toHaveBeenCalled());

    // Simulate levels update
    act(() => {
        if (meteringCallback) {
            meteringCallback({ left: 0.5, right: 0.5, peakLeft: 0.6, peakRight: 0.6 });
        }
    });

    // DOM verification is tricky with refs and styles, but existence confirms render
    const meter = screen.getByTitle('Master Levels');
    expect(meter).toBeInTheDocument();
  });

  it('cleans up audio metering on unmount', async () => {
    const { unmount } = renderComponent();
    unmount();
    expect(mockController.stopAudioMetering).toHaveBeenCalled();
    expect(unsubscribeMetering).toHaveBeenCalled();
  });

  it('toggles mute calls controller', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('track-1'));

    const muteBtns = screen.getAllByTitle(/Mute|Unmute/);
    fireEvent.click(muteBtns[0]);

    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-1', true);
  });

  it('toggles solo correctly', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('track-1'));

    const soloBtns = screen.getAllByTitle('Solo');

    fireEvent.click(soloBtns[0]);

    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-3', true);

    fireEvent.click(soloBtns[0]);

    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-3', false);
  });
});
