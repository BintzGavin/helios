import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import { useStudio } from '../../context/StudioContext';

// Mock the module
vi.mock('../../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('EmptyState', () => {
  it('renders Scenario A (Fresh Project) when compositions are empty', () => {
    // Setup mock return value for this test
    const mockSetCreateOpen = vi.fn();
    (useStudio as any).mockReturnValue({
      compositions: [],
      setCreateOpen: mockSetCreateOpen,
      setOmnibarOpen: vi.fn(),
    });

    render(<EmptyState />);

    expect(screen.getByText('Welcome to Helios Studio')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first composition.')).toBeInTheDocument();

    const createButton = screen.getByText('+ Create Composition');
    expect(createButton).toBeInTheDocument();

    fireEvent.click(createButton);
    expect(mockSetCreateOpen).toHaveBeenCalledWith(true);
  });

  it('renders Scenario B (Project Loaded) when compositions exist', () => {
    const mockSetOmnibarOpen = vi.fn();
    (useStudio as any).mockReturnValue({
      compositions: [{ id: '1', name: 'Test Comp' }],
      setCreateOpen: vi.fn(),
      setOmnibarOpen: mockSetOmnibarOpen,
    });

    render(<EmptyState />);

    expect(screen.getByText('No Composition Selected')).toBeInTheDocument();
    expect(screen.getByText('Select a composition to start editing.')).toBeInTheDocument();

    const selectButton = screen.getByText(/Select Composition/);
    expect(selectButton).toBeInTheDocument();

    fireEvent.click(selectButton);
    expect(mockSetOmnibarOpen).toHaveBeenCalledWith(true);
  });
});
