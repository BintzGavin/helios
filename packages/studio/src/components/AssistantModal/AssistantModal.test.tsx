import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AssistantModal } from './AssistantModal';
import { useStudio } from '../../context/StudioContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock useStudio
vi.mock('../../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('AssistantModal', () => {
  const mockSetAssistantOpen = vi.fn();
  const mockDocs = [
    { id: '1', package: 'core', title: 'Audio Component', content: 'Audio content details' },
    { id: '2', package: 'player', title: 'Video Component', content: 'Video usage instructions' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useStudio as any).mockReturnValue({
      isAssistantOpen: true,
      setAssistantOpen: mockSetAssistantOpen,
      activeComposition: { name: 'Test Comp' },
      playerState: { schema: { type: 'object' } }
    });

    // Mock fetch
    global.fetch = vi.fn(() =>
        Promise.resolve({
            json: () => Promise.resolve(mockDocs)
        })
    ) as any;

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders correctly when open', async () => {
    await act(async () => {
      render(<AssistantModal />);
    });
    expect(screen.getByText('✨ Helios Assistant')).toBeInTheDocument();
  });

  it('returns null when closed', async () => {
    (useStudio as any).mockReturnValue({
      isAssistantOpen: false,
      setAssistantOpen: mockSetAssistantOpen,
      activeComposition: { name: 'Test Comp' },
      playerState: { schema: { type: 'object' } }
    });
    const { container } = render(<AssistantModal />);
    expect(container.firstChild).toBeNull();
  });

  it('fetches docs on mount', async () => {
    await act(async () => {
      render(<AssistantModal />);
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/documentation'));
  });

  it('switches tabs', async () => {
    await act(async () => {
      render(<AssistantModal />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Documentation'));
    });
    expect(screen.getByPlaceholderText('Search documentation...')).toBeInTheDocument();
  });

  it('closes when close button is clicked', async () => {
    await act(async () => {
      render(<AssistantModal />);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('×'));
    });
    expect(mockSetAssistantOpen).toHaveBeenCalledWith(false);
  });

  it('closes when overlay is clicked', async () => {
    await act(async () => {
      render(<AssistantModal />);
    });

    // Using a specific class selector since it doesn't have an accessible name
    const overlay = document.querySelector('.assistant-modal-overlay');
    expect(overlay).not.toBeNull();

    await act(async () => {
      if (overlay) fireEvent.click(overlay);
    });
    expect(mockSetAssistantOpen).toHaveBeenCalledWith(false);
  });

  it('does not close when modal content is clicked', async () => {
    await act(async () => {
      render(<AssistantModal />);
    });

    const content = document.querySelector('.assistant-modal-content');
    expect(content).not.toBeNull();

    await act(async () => {
      if (content) fireEvent.click(content);
    });
    expect(mockSetAssistantOpen).not.toHaveBeenCalled();
  });

  describe('Ask AI tab', () => {
    it('generates prompt with context and matched docs', async () => {
      await act(async () => {
        render(<AssistantModal />);
      });
      // Wait for fetch to complete
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      const input = screen.getByPlaceholderText('How do I add audio?');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'How to use audio?' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Generate Prompt'));
      });

      // Verify generated prompt
      const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[];
      const textarea = textareas.find(t => t.tagName === 'TEXTAREA')!;
      expect(textarea.value).toContain('Test Comp');
      expect(textarea.value).toContain('Schema: {');

      expect(textarea.value).toContain('How to use audio?');
    });

    it('generates prompt with enter key', async () => {
      await act(async () => {
        render(<AssistantModal />);
      });
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      const input = screen.getByPlaceholderText('How do I add audio?');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'help' } });
      });

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      });

      const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[];
      const textarea = textareas.find(t => t.tagName === 'TEXTAREA')!;
      expect(textarea.value).toContain('help');
    });

    it('does not generate prompt for empty query', async () => {
      await act(async () => {
        render(<AssistantModal />);
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Generate Prompt'));
      });

      // Textarea shouldn't exist
      const textareas = screen.getAllByRole('textbox');
      expect(textareas.filter(t => t.tagName === 'TEXTAREA').length).toBe(0);
    });

    it('copies to clipboard', async () => {
      await act(async () => {
        render(<AssistantModal />);
      });
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      const input = screen.getByPlaceholderText('How do I add audio?');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'test query' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Generate Prompt'));
      });

      const copyBtn = screen.getByText('Copy to Clipboard');
      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('handles missing schema', async () => {
      (useStudio as any).mockReturnValue({
        isAssistantOpen: true,
        setAssistantOpen: mockSetAssistantOpen,
        activeComposition: { name: 'Test Comp' },
        playerState: {} // No schema
      });

      await act(async () => {
        render(<AssistantModal />);
      });
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      const input = screen.getByPlaceholderText('How do I add audio?');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'query' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Generate Prompt'));
      });

      const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[];
      const textarea = textareas.find(t => t.tagName === 'TEXTAREA')!;
      expect(textarea.value).not.toContain('Schema:');
    });
  });

  describe('Documentation tab', () => {
    it('filters docs by search', async () => {
      await act(async () => {
        render(<AssistantModal />);
      });
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      // Switch to docs tab
      await act(async () => {
        fireEvent.click(screen.getByText('Documentation'));
      });

      // Both docs initially shown
      expect(screen.getByText('Audio Component')).toBeInTheDocument();
      expect(screen.getByText('Video Component')).toBeInTheDocument();

      // Search
      const searchInput = screen.getByPlaceholderText('Search documentation...');
      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'video' } });
      });

      // Only Video should be shown
      expect(screen.queryByText('Audio Component')).not.toBeInTheDocument();
      expect(screen.getByText('Video Component')).toBeInTheDocument();
    });

    it('toggles doc sections', async () => {
      await act(async () => {
        render(<AssistantModal />);
      });
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      // Switch to docs tab
      await act(async () => {
        fireEvent.click(screen.getByText('Documentation'));
      });

      // Click doc header to expand
      await act(async () => {
        fireEvent.click(screen.getByText('Audio Component'));
      });

      // Content should be visible
      expect(screen.getByText('Audio content details')).toBeInTheDocument();

      // Click again to collapse
      await act(async () => {
        fireEvent.click(screen.getByText('Audio Component'));
      });

      // Content should be hidden
      expect(screen.queryByText('Audio content details')).not.toBeInTheDocument();
    });
  });
});
