import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  beforeEach(() => {
    mockController = {
      getAudioTracks: vi.fn().mockResolvedValue([...mockTracks]),
      setAudioTrackMuted: vi.fn(),
      setAudioTrackVolume: vi.fn(),
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

  it('toggles mute calls controller', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('track-1'));

    const muteBtns = screen.getAllByTitle(/Mute|Unmute/);
    // track-1 is unmuted (index 0)
    fireEvent.click(muteBtns[0]);

    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-1', true);
  });

  it('toggles solo correctly', async () => {
    renderComponent();
    await waitFor(() => screen.getByText('track-1'));

    const soloBtns = screen.getAllByTitle('Solo');

    // Solo track-1
    // Initial state:
    // track-1: unmuted
    // track-2: muted
    // track-3: unmuted

    fireEvent.click(soloBtns[0]);

    // Expect track-1 to stay unmuted (or be unmuted if it was muted)
    // Expect track-2 to stay muted
    // Expect track-3 to become muted

    // Check calls
    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-3', true);
    // track-2 was already muted, so it might not be called if we optimize,
    // but the plan said "mute others".
    // track-1 was already unmuted.

    // Let's verify subsequent state restoration
    // Unsolo track-1
    fireEvent.click(soloBtns[0]);

    // Should restore:
    // track-3 to unmuted
    expect(mockController.setAudioTrackMuted).toHaveBeenCalledWith('track-3', false);
  });
});
