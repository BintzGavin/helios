import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PropsEditor } from './PropsEditor';
import * as StudioContext from '../context/StudioContext';
import type { HeliosSchema } from '@helios-project/core';

// Mock the context
vi.mock('../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('PropsEditor', () => {
  const mockSetInputProps = vi.fn();

  const defaultContext = {
    controller: { setInputProps: mockSetInputProps },
    playerState: {
      inputProps: {},
      schema: undefined
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing if no controller or props', () => {
    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        controller: null
    });
    render(<PropsEditor />);
    expect(screen.getByText('No active controller')).toBeInTheDocument();

    (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: { inputProps: {} }
    });
    render(<PropsEditor />);
    expect(screen.getByText('No input props defined')).toBeInTheDocument();
  });

  it('renders standard inputs when no schema is present', () => {
    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
            textProp: 'hello',
            numberProp: 42,
            boolProp: true
        }
      }
    });

    render(<PropsEditor />);

    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    // Checkbox is a bit harder to query by display value, check by label or role
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('renders schema-aware inputs', () => {
    const schema: HeliosSchema = {
        enumProp: { type: 'string', enum: ['Option A', 'Option B'] },
        rangeProp: { type: 'number', minimum: 0, maximum: 100 },
        boolProp: { type: 'boolean', label: 'My Toggle' }
    };

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
            enumProp: 'Option A',
            rangeProp: 50,
            boolProp: false
        },
        schema
      }
    });

    render(<PropsEditor />);

    // Check Enum (Combobox/Select)
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('Option A');

    // Check Range (Slider)
    const slider = screen.getByRole('slider'); // range input has slider role
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('50');

    // Check Label override
    expect(screen.getByText('My Toggle')).toBeInTheDocument();
  });

  it('updates props on change', () => {
      (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
            textProp: 'hello'
        }
      }
    });

    render(<PropsEditor />);

    const input = screen.getByDisplayValue('hello');
    fireEvent.change(input, { target: { value: 'world' } });

    expect(mockSetInputProps).toHaveBeenCalledWith({ textProp: 'world' });
  });

  it('handles schema fallback gracefully', () => {
      // Schema defines 'a', but inputProps has 'a' and 'b'. 'b' should fallback.
      const schema: HeliosSchema = {
        a: { type: 'string' }
      };

      (StudioContext.useStudio as any).mockReturnValue({
        ...defaultContext,
        playerState: {
            inputProps: {
                a: 'A',
                b: 'B'
            },
            schema
        }
      });

      render(<PropsEditor />);

      expect(screen.getByDisplayValue('A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('B')).toBeInTheDocument();
  });
});
