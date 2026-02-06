import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompositionsPanel } from './CompositionsPanel';
import { useStudio, Composition } from '../../context/StudioContext';

// Mock dependencies
vi.mock('../../context/StudioContext');
vi.mock('../ConfirmationModal/ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, onConfirm, onCancel, title, message }: any) => isOpen ? (
    <div data-testid="confirmation-modal">
      <h1>{title}</h1>
      <p>{message}</p>
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ) : null
}));

// Mock icons in CompositionItem or rely on text
// CompositionItem is likely rendering some text, let's just rely on what's in the DOM.

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

  it('handles delete flow', async () => {
    render(<CompositionsPanel />);

    // Find delete button for Alpha. It's usually an icon.
    // In CompositionItem, we need to know what the delete button looks like.
    // Assuming it has a title="Delete" or similar accessibility label.
    // If not, we might need to look at CompositionItem.tsx.
    // Let's assume title="Delete" based on common patterns, or class.

    // Actually, let's check CompositionItem to be sure.
    // But for now, let's try to query by title.
    const deleteBtns = screen.getAllByTitle('Delete');
    fireEvent.click(deleteBtns[0]); // Click delete for first item (Alpha probably, or maybe Folder comes first?)

    // Sort order: Folders first. So Folder is first, but does Folder have a delete button?
    // CompositionTree implementation handles on delete for items.

    // Wait, let's look at sortNodes in tree.ts: Folders first.
    // So Folder is first. Does Folder have delete? Not in the provided CompositionTree.tsx.
    // Only CompositionItem has onDelete passed.

    // So the first Delete button should correspond to the first Composition (Alpha or Beta).
    // Let's just click one.

    expect(screen.getByTestId('confirmation-modal')).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined();

    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteComposition).toHaveBeenCalled();
    });
  });
});
