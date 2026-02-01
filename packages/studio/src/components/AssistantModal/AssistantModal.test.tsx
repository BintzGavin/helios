import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssistantModal } from './AssistantModal';
import { useStudio } from '../../context/StudioContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock useStudio
vi.mock('../../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('AssistantModal', () => {
  const mockSetAssistantOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useStudio as any).mockReturnValue({
      isAssistantOpen: true,
      setAssistantOpen: mockSetAssistantOpen,
      activeComposition: { name: 'Test Comp' },
      playerState: { schema: {} }
    });

    // Mock fetch
    global.fetch = vi.fn(() =>
        Promise.resolve({
            json: () => Promise.resolve([
                { id: '1', package: 'core', title: 'Audio', content: 'Audio content' }
            ])
        })
    ) as any;
  });

  it('renders correctly when open', async () => {
    render(<AssistantModal />);
    expect(screen.getByText('✨ Helios Assistant')).toBeInTheDocument();
  });

  it('fetches docs on mount', async () => {
    render(<AssistantModal />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/documentation'));
  });

  it('switches tabs', () => {
    render(<AssistantModal />);
    fireEvent.click(screen.getByText('Documentation'));
    expect(screen.getByPlaceholderText('Search documentation...')).toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    render(<AssistantModal />);
    fireEvent.click(screen.getByText('×'));
    expect(mockSetAssistantOpen).toHaveBeenCalledWith(false);
  });
});
