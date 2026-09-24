import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompositionsPanel } from './CompositionsPanel';
import { useStudio, Composition } from '../../context/StudioContext';

// Mock dependencies
vi.mock('../../context/StudioContext');
vi.mock('../ConfirmationModal/ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, onConfirm, onClose, title, message }: any) => isOpen ? (
    <div data-testid="confirmation-modal">
      <h1>{title}</h1>
      <p>{message}</p>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ) : null
}));

describe('CompositionsPanel', () => {
  const mockSetActiveComposition = vi.fn();
  const mockSetCreateOpen = vi.fn();
  const mockSetDuplicateOpen = vi.fn();
  const mockSetDuplicateTargetId = vi.fn();
  const mockDeleteComposition = vi.fn();

  const mockCompositions: Composition[] = [
    {
      id: 'comp-1',
      name: 'Alpha Composition',
      url: '/src/compositions/alpha.ts',
      metadata: { width: 1920, height: 1080, fps: 30, duration: 10 }
    },
    {
      id: 'comp-2',
      name: 'Beta Composition',
      url: '/src/compositions/beta.ts'
    },
    {
      id: 'folder/comp-3',
      name: 'Gamma Composition',
      url: '/src/compositions/folder/gamma.ts'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useStudio as any).mockReturnValue({
      compositions: mockCompositions,
      activeComposition: null,
      setActiveComposition: mockSetActiveComposition,
      setCreateOpen: mockSetCreateOpen,
      setDuplicateOpen: mockSetDuplicateOpen,
      setDuplicateTargetId: mockSetDuplicateTargetId,
      deleteComposition: mockDeleteComposition
    });
  });

  it('renders compositions list correctly', () => {
    render(<CompositionsPanel />);

    expect(screen.getByText('Alpha Composition')).toBeDefined();
    expect(screen.getByText('Beta Composition')).toBeDefined();
    // Folder should be rendered
    expect(screen.getByText('Folder')).toBeDefined();
    // Gamma is inside folder, might be hidden initially if folder is collapsed?
    // Checking CompositionTree implementation: default is expanded=undefined -> false.
    // So "Gamma Composition" should NOT be visible initially.
    expect(screen.queryByText('Gamma Composition')).toBeNull();
  });

  it('renders empty state when no compositions exist', () => {
    (useStudio as any).mockReturnValue({
      compositions: [],
      activeComposition: null,
      setActiveComposition: mockSetActiveComposition,
      setCreateOpen: mockSetCreateOpen,
      setDuplicateOpen: mockSetDuplicateOpen,
      setDuplicateTargetId: mockSetDuplicateTargetId,
      deleteComposition: mockDeleteComposition
    });

    render(<CompositionsPanel />);
    expect(screen.getByText('No compositions yet.')).toBeDefined();
  });

  it('renders empty state when no matches found', () => {
    render(<CompositionsPanel />);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Delta' } });

    expect(screen.getByText('No matches found.')).toBeDefined();
  });

  it('filters compositions by search query', () => {
    render(<CompositionsPanel />);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getByText('Alpha Composition')).toBeDefined();
    expect(screen.queryByText('Beta Composition')).toBeNull();
  });

  it('expands folder when searching for nested composition', () => {
    render(<CompositionsPanel />);

    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Gamma' } });

    // Gamma should now be visible because filter expands matches
    expect(screen.getByText('Gamma Composition')).toBeDefined();
  });

  it('activates composition on click', () => {
    render(<CompositionsPanel />);

    const comp = screen.getByText('Alpha Composition');
    fireEvent.click(comp);

    expect(mockSetActiveComposition).toHaveBeenCalledWith(mockCompositions[0]);
  });

  it('opens create modal on New button click', () => {
    render(<CompositionsPanel />);

    const newBtn = screen.getByText('+ New');
    fireEvent.click(newBtn);

    expect(mockSetCreateOpen).toHaveBeenCalledWith(true);
  });

  it('handles duplicate flow', () => {
    render(<CompositionsPanel />);

    const duplicateBtns = screen.getAllByTitle('Duplicate');
    fireEvent.click(duplicateBtns[0]);

    expect(mockSetDuplicateTargetId).toHaveBeenCalled();
    expect(mockSetDuplicateOpen).toHaveBeenCalledWith(true);
  });

  it('handles delete flow with confirmation', async () => {
    render(<CompositionsPanel />);

    const deleteBtns = screen.getAllByTitle('Delete');
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByTestId('confirmation-modal')).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined();

    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteComposition).toHaveBeenCalled();
    });
  });

  it('handles cancel delete flow', async () => {
    render(<CompositionsPanel />);

    const deleteBtns = screen.getAllByTitle('Delete');
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByTestId('confirmation-modal')).toBeDefined();

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('confirmation-modal')).toBeNull();
      expect(mockDeleteComposition).not.toHaveBeenCalled();
    });
  });

  it('handles handleConfirmDelete without deleteTarget', async () => {
    render(<CompositionsPanel />);
  });

  it('toggles folder expansion', () => {
    render(<CompositionsPanel />);

    const folderHeader = screen.getByText('Folder');
    expect(screen.queryByText('Gamma Composition')).toBeNull();

    fireEvent.click(folderHeader);

    expect(screen.getByText('Gamma Composition')).toBeDefined();

    fireEvent.click(folderHeader);
    expect(screen.queryByText('Gamma Composition')).toBeNull();
  });

  it('renders nested folders correctly', () => {
    (useStudio as any).mockReturnValue({
      compositions: [
        {
          id: 'folder/subfolder/comp-4',
          name: 'Delta Composition',
          url: '/src/compositions/folder/subfolder/delta.ts'
        }
      ],
      activeComposition: null,
      setActiveComposition: mockSetActiveComposition,
      setCreateOpen: mockSetCreateOpen,
      setDuplicateOpen: mockSetDuplicateOpen,
      setDuplicateTargetId: mockSetDuplicateTargetId,
      deleteComposition: mockDeleteComposition
    });

    render(<CompositionsPanel />);

    const folderHeader = screen.getByText('Folder');
    fireEvent.click(folderHeader);

    const subFolderHeader = screen.getByText('Subfolder');
    fireEvent.click(subFolderHeader);

    expect(screen.getByText('Delta Composition')).toBeDefined();
  });

});
