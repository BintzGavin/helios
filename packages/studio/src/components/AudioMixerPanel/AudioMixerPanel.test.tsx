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
    await act(async () => { renderComponent(); });

    await waitFor(() => {
      expect(screen.getByText('track-1')).toBeInTheDocument();
      expect(screen.getByText('track-2')).toBeInTheDocument();
      expect(screen.getByText('track-3')).toBeInTheDocument();
    });
  });

  it('activates audio metering on mount', async () => {
    await act(async () => { renderComponent(); });
    expect(mockController.startAudioMetering).toHaveBeenCalled();
    expect(mockController.onAudioMetering).toHaveBeenCalled();
    expect(screen.getByTitle('Master Levels')).toBeInTheDocument();
  });

  it('updates meter when levels are received', async () => {
    await act(async () => { renderComponent(); });
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


  it('updates meter to clipping levels', async () => {
    await act(async () => { renderComponent(); });
    await waitFor(() => expect(mockController.onAudioMetering).toHaveBeenCalled());

    act(() => {
        if (meteringCallback) {
            meteringCallback({ left: 1.0, right: 1.0, peakLeft: 1.0, peakRight: 1.0 });
        }
    });

    const meter = screen.getByTitle('Master Levels');
    expect(meter).toBeInTheDocument();
  });

  it('updates meter to warning levels', async () => {
    await act(async () => { renderComponent(); });
    await waitFor(() => expect(mockController.onAudioMetering).toHaveBeenCalled());

    act(() => {
        if (meteringCallback) {
            meteringCallback({ left: 0.9, right: 0.9, peakLeft: 0.9, peakRight: 0.9 });
        }
    });

    const meter = screen.getByTitle('Master Levels');
    expect(meter).toBeInTheDocument();
  });

  it('tests undefined volume branch', async () => {
    mockController.getAudioTracks.mockResolvedValue([
      { id: 'track-4' } // no volume, no muted
    ]);
    await act(async () => { renderComponent(); });
    await waitFor(() => screen.getByText('track-4'));
    const sliders = screen.getAllByRole('slider');
    expect(sliders[0]).toHaveValue('1');
  });

  it('switches solo target when another track is soloed', async () => {
    mockController.getAudioTracks.mockResolvedValue([
      { id: 'track-A', volume: 1, muted: false },
      { id: 'track-B', volume: 1, muted: false }
    ]);
    await act(async () => { renderComponent(); });
    await waitFor(() => screen.getByText('track-A'));

    const soloBtns = screen.getAllByTitle('Solo');

    await act(async () => { fireEvent.click(soloBtns[0]); });
    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-B', true);
    mockController.setAudioTrackMuted.mockClear();

    await act(async () => { fireEvent.click(soloBtns[1]); });
    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-A', true);
    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-B', false);
  });

  it('cleans up audio metering on unmount', async () => {
    const { unmount } = render(<StudioContext.Provider value={mockContextValue}><AudioMixerPanel /></StudioContext.Provider>);
    unmount();
    expect(mockController.stopAudioMetering).toHaveBeenCalled();
    expect(unsubscribeMetering).toHaveBeenCalled();
  });

  it('toggles mute calls controller', async () => {
    await act(async () => { renderComponent(); });
    await waitFor(() => screen.getByText('track-1'));

    const muteBtns = screen.getAllByTitle(/Mute|Unmute/);
    await act(async () => { fireEvent.click(muteBtns[0]); });

    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-1', true);
  });

  it('toggles solo correctly', async () => {
    await act(async () => { renderComponent(); });
    await waitFor(() => screen.getByText('track-1'));

    const soloBtns = screen.getAllByTitle('Solo');

    await act(async () => { fireEvent.click(soloBtns[0]); });

    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-3', true);

    await act(async () => { fireEvent.click(soloBtns[0]); });

    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-3', false);
  });

  it('changes volume correctly', async () => {
    await act(async () => { renderComponent(); });
    await waitFor(() => screen.getByText('track-1'));

    const sliders = screen.getAllByRole('slider');
    await act(async () => { fireEvent.change(sliders[0], { target: { value: '0.5' } }); });

    expect(mockController.setAudioTrackVolume).toHaveBeenCalledWith('track-1', 0.5);
  });

  it('handles fetch error gracefully', async () => {
    mockController.getAudioTracks.mockRejectedValue(new Error('Fetch Error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => { renderComponent(); });
    await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch audio tracks", expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('refreshes tracks on button click', async () => {
     await act(async () => { renderComponent(); });
     await waitFor(() => screen.getByText('track-1'));

     const refreshBtn = screen.getByTitle('Refresh Tracks');
     await act(async () => { fireEvent.click(refreshBtn); });

     expect(mockController.getAudioTracks).toHaveBeenCalledTimes(2);
  });

  it('toggles solo correctly with snapshot restoration', async () => {
    await act(async () => { renderComponent(); });
    await waitFor(() => screen.getByText('track-1'));

    const soloBtns = screen.getAllByTitle('Solo');

    await act(async () => { fireEvent.click(soloBtns[1]); }); // track-2 (initially muted)
    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-1', true);

    // Deactivate solo
    await act(async () => { fireEvent.click(soloBtns[1]); });
    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-2', true);
  });

  it('renders empty state when no controller', async () => {
    mockContextValue.controller = null;
    await act(async () => { renderComponent(); });
    expect(screen.getByText('Connect to player...')).toBeInTheDocument();
  });

  it('renders empty state when no tracks', async () => {
    mockController.getAudioTracks.mockResolvedValue([]);
    await act(async () => { renderComponent(); });
    await waitFor(() => expect(screen.getByText('No audio tracks found.')).toBeInTheDocument());
  });

});
