import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComponentsPanel } from './ComponentsPanel';

// Mock ToastContext
const mockAddToast = vi.fn();
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    addToast: mockAddToast
  })
}));

describe('ComponentsPanel', () => {
  const mockComponents = [
    {
      name: 'Timer',
      description: 'A countdown timer',
      installed: false,
      type: 'Component',
      files: [],
      dependencies: { 'date-fns': '^2.0.0' }
    },
    {
      name: 'Watermark',
      description: 'Adds a logo overlay',
      installed: true,
      type: 'Component',
      files: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.confirm = vi.fn(() => true); // Auto-confirm
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', async () => {
    // Mock a promise that never resolves to keep loading state
    (global.fetch as any).mockReturnValue(new Promise(() => {}));

    render(<ComponentsPanel />);
    expect(screen.getByText('Loading registry...')).toBeDefined();
  });

  it('renders components list after fetch', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockComponents
    });

    render(<ComponentsPanel />);

    await waitFor(() => {
      expect(screen.getByText('Timer')).toBeDefined();
      expect(screen.getByText('Watermark')).toBeDefined();
    });

    expect(screen.getByText('A countdown timer')).toBeDefined();
    expect(screen.getByText('Deps: date-fns')).toBeDefined();
    expect(screen.getByText('Installed')).toBeDefined(); // Badge
  });

  it('renders empty state when no components found', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    render(<ComponentsPanel />);

    await waitFor(() => {
      expect(screen.getByText('No components found in registry.')).toBeDefined();
    });
  });

  it('handles Install flow', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ // Initial fetch
        ok: true,
        json: async () => mockComponents
      })
      .mockResolvedValueOnce({ // Install POST
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({ // Re-fetch
        ok: true,
        json: async () => [{ ...mockComponents[0], installed: true }, mockComponents[1]]
      });

    render(<ComponentsPanel />);

    await waitFor(() => screen.getByText('Timer'));

    const installBtn = screen.getByText('Install');
    fireEvent.click(installBtn);

    expect(screen.getByText('Installing...')).toBeDefined();
    expect(installBtn).toBeDisabled();

    await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Component "Timer" installed', 'success');
    });

    // Verify POST
    expect(global.fetch).toHaveBeenCalledWith('/api/components', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Timer' })
    }));
  });

  it('handles Update flow', async () => {
     (global.fetch as any)
      .mockResolvedValueOnce({ // Initial fetch
        ok: true,
        json: async () => mockComponents
      })
      .mockResolvedValueOnce({ // Update PUT
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({ // Re-fetch
        ok: true,
        json: async () => mockComponents
      });

    render(<ComponentsPanel />);
    await waitFor(() => screen.getByText('Watermark'));

    const updateBtn = screen.getByText('Update');
    fireEvent.click(updateBtn);

    expect(screen.getByText('Updating...')).toBeDefined();

    await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Component "Watermark" updated', 'success');
    });

    // Verify PUT
    expect(global.fetch).toHaveBeenCalledWith('/api/components', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Watermark' })
    }));
  });

  it('handles Remove flow', async () => {
     (global.fetch as any)
      .mockResolvedValueOnce({ // Initial fetch
        ok: true,
        json: async () => mockComponents
      })
      .mockResolvedValueOnce({ // Remove DELETE
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({ // Re-fetch
        ok: true,
        json: async () => [mockComponents[0]] // Watermark removed
      });

    render(<ComponentsPanel />);
    await waitFor(() => screen.getByText('Watermark'));

    const removeBtn = screen.getByText('Remove');
    fireEvent.click(removeBtn);

    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Are you sure'));
    expect(screen.getByText('Removing...')).toBeDefined();

    await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Component "Watermark" removed', 'success');
    });

    // Verify DELETE
    expect(global.fetch).toHaveBeenCalledWith('/api/components?name=Watermark', expect.objectContaining({
        method: 'DELETE'
    }));
  });

  it('handles API error on fetch', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<ComponentsPanel />);

    await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Failed to load components', 'error');
    });
    // Loading state is removed on error
    expect(screen.queryByText('Loading registry...')).toBeNull();
  });

  it('handles API error on action', async () => {
     (global.fetch as any)
      .mockResolvedValueOnce({ // Initial fetch
        ok: true,
        json: async () => mockComponents
      })
      .mockResolvedValueOnce({ // Install POST error
        ok: false,
        json: async () => ({ error: 'Permission denied' })
      });

    render(<ComponentsPanel />);
    await waitFor(() => screen.getByText('Timer'));

    const installBtn = screen.getByText('Install');
    fireEvent.click(installBtn);

    await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Permission denied', 'error');
    });
    // Button should revert
    expect(screen.getByText('Install')).toBeDefined();
    expect(screen.queryByText('Installing...')).toBeNull();
  });
});
