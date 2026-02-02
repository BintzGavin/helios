import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import { StudioContext } from '../../context/StudioContext';

describe('EmptyState', () => {
  const mockSetCreateOpen = vi.fn();
  const mockSetOmnibarOpen = vi.fn();

  const renderWithContext = (compositions: any[]) => {
    return render(
      <StudioContext.Provider
        value={{
            compositions,
            setCreateOpen: mockSetCreateOpen,
            setOmnibarOpen: mockSetOmnibarOpen,
        } as any}
      >
        <EmptyState />
      </StudioContext.Provider>
    );
  };

  it('renders Welcome screen when no compositions exist', () => {
    renderWithContext([]);
    expect(screen.getByText('Welcome to Helios Studio')).toBeInTheDocument();
    expect(screen.getByText('+ Create Composition')).toBeInTheDocument();
  });

  it('opens Create Modal on click', () => {
    renderWithContext([]);
    fireEvent.click(screen.getByText('+ Create Composition'));
    expect(mockSetCreateOpen).toHaveBeenCalledWith(true);
  });

  it('renders "No Composition Selected" when compositions exist', () => {
    renderWithContext([{ id: '1', name: 'Test' }]);
    expect(screen.getByText('No Composition Selected')).toBeInTheDocument();
    expect(screen.getByText(/Select Composition/)).toBeInTheDocument();
  });

  it('opens Omnibar on click', () => {
    renderWithContext([{ id: '1', name: 'Test' }]);
    fireEvent.click(screen.getByText(/Select Composition/));
    expect(mockSetOmnibarOpen).toHaveBeenCalledWith(true);
  });
});
