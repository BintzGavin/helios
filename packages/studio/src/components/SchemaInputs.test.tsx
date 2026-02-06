import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SchemaInput } from './SchemaInputs';
import * as StudioContext from '../context/StudioContext';
import type { HeliosSchema } from '@helios-project/core';

// Mock the context
vi.mock('../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('SchemaInput Validation', () => {
  const mockOnChange = vi.fn();

  const defaultContext = {
    playerState: {
      fps: 30
    },
    assets: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  describe('String Validation', () => {
    it('shows error for string shorter than minLength', () => {
      const def = { type: 'string', minLength: 5 };
      render(<SchemaInput definition={def} value="abc" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('error');
      expect(input).toHaveAttribute('title', expect.stringContaining('Too short'));
    });

    it('shows error for string longer than maxLength', () => {
      const def = { type: 'string', maxLength: 3 };
      render(<SchemaInput definition={def} value="abcd" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('error');
      expect(input).toHaveAttribute('title', expect.stringContaining('Too long'));
    });

    it('shows error for pattern mismatch', () => {
      const def = { type: 'string', pattern: '^[0-9]+$' };
      render(<SchemaInput definition={def} value="abc" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('error');
      expect(input).toHaveAttribute('title', expect.stringContaining('Pattern mismatch'));
    });

    it('does not show error for valid string', () => {
      const def = { type: 'string', minLength: 2, maxLength: 5, pattern: '^[a-z]+$' };
      render(<SchemaInput definition={def} value="abc" onChange={mockOnChange} />);

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('error');
    });
  });

  describe('Number Validation', () => {
    it('shows error for number less than minimum', () => {
      const def = { type: 'number', minimum: 10 };
      render(<SchemaInput definition={def} value={5} onChange={mockOnChange} />);

      // NumberRangeInput renders two inputs if range is possible, or just one number input
      // Since min is set but max is undefined, "hasRange" is false.
      // It renders: <input type="number" ... />
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveClass('error');
      expect(input).toHaveAttribute('title', expect.stringContaining('Value too low'));
    });

    it('shows error for number greater than maximum', () => {
      const def = { type: 'number', maximum: 10 };
      render(<SchemaInput definition={def} value={15} onChange={mockOnChange} />);

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveClass('error');
      expect(input).toHaveAttribute('title', expect.stringContaining('Value too high'));
    });

    it('does not show error for valid number', () => {
      const def = { type: 'number', minimum: 0, maximum: 10 };
      render(<SchemaInput definition={def} value={5} onChange={mockOnChange} />);

      const input = screen.getByRole('spinbutton');
      expect(input).not.toHaveClass('error');
    });
  });
});
