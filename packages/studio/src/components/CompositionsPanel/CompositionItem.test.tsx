import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CompositionItem } from './CompositionItem';
import { useStudio, Composition } from '../../context/StudioContext';

vi.mock('../../context/StudioContext');

describe('CompositionItem', () => {
  const mockOpenInEditor = vi.fn();
  const mockOnSelect = vi.fn();
  const mockOnDuplicate = vi.fn();
  const mockOnDelete = vi.fn();

  const composition: Composition = {
    id: 'comp-1',
    name: 'Test Composition',
    url: '/test.ts',
    thumbnailUrl: '/thumbnail.png'
  };

  const compositionNoThumb: Composition = {
    id: 'comp-2',
    name: 'No Thumb Composition',
    url: '/no-thumb.ts'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useStudio as any).mockReturnValue({
      openInEditor: mockOpenInEditor
    });
  });

  it('renders correctly with thumbnail', () => {
    render(
      <CompositionItem
        composition={composition}
        isActive={false}
        onSelect={mockOnSelect}
        onDuplicate={mockOnDuplicate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByAltText('Test Composition')).toBeDefined();
    expect(screen.getByText('Test Composition')).toBeDefined();
  });

  it('renders correctly without thumbnail', () => {
    render(
      <CompositionItem
        composition={compositionNoThumb}
        isActive={true}
        onSelect={mockOnSelect}
        onDuplicate={mockOnDuplicate}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('🎬')).toBeDefined();
    expect(screen.getByText('No Thumb Composition')).toBeDefined();
    // Verify isActive class
    const container = screen.getByText('No Thumb Composition').closest('.composition-item');
    expect(container?.className).toContain('active');
  });

  it('calls openInEditor when editor button clicked', () => {
    render(
      <CompositionItem
        composition={composition}
        isActive={false}
        onSelect={mockOnSelect}
        onDuplicate={mockOnDuplicate}
        onDelete={mockOnDelete}
      />
    );

    const openBtn = screen.getByTitle('Open in Editor');
    fireEvent.click(openBtn);

    expect(mockOpenInEditor).toHaveBeenCalledWith('comp-1');
    expect(mockOnSelect).not.toHaveBeenCalled(); // due to stopPropagation
  });

});
