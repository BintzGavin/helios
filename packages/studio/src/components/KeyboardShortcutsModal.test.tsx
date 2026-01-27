import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import * as StudioContext from '../context/StudioContext';

// Mock the context
vi.mock('../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('KeyboardShortcutsModal', () => {
  const mockSetHelpOpen = vi.fn();

  const defaultContext = {
    isHelpOpen: false,
    setHelpOpen: mockSetHelpOpen,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders nothing when isHelpOpen is false', () => {
    const { container } = render(<KeyboardShortcutsModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the modal when isHelpOpen is true', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      isHelpOpen: true,
    });

    render(<KeyboardShortcutsModal />);

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Playback')).toBeInTheDocument();
    expect(screen.getByText('Play / Pause')).toBeInTheDocument();
    expect(screen.getByText('Space')).toBeInTheDocument();
  });

  it('closes when Escape key is pressed', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      isHelpOpen: true,
    });

    render(<KeyboardShortcutsModal />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockSetHelpOpen).toHaveBeenCalledWith(false);
  });

  it('closes when close button is clicked', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      isHelpOpen: true,
    });

    render(<KeyboardShortcutsModal />);

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockSetHelpOpen).toHaveBeenCalledWith(false);
  });

  it('closes when overlay is clicked', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      isHelpOpen: true,
    });

    const { container } = render(<KeyboardShortcutsModal />);
    const overlay = container.querySelector('.shortcuts-modal-overlay');

    if (overlay) {
      fireEvent.click(overlay);
      expect(mockSetHelpOpen).toHaveBeenCalledWith(false);
    } else {
      throw new Error('Overlay not found');
    }
  });
});
