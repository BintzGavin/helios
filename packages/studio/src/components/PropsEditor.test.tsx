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

  it('renders asset inputs with suggestions', () => {
    const schema: HeliosSchema = {
      imageProp: { type: 'image' }
    };

    const assets = [
      { id: '1', name: 'image.png', url: '/assets/image.png', type: 'image' },
      { id: '2', name: 'video.mp4', url: '/assets/video.mp4', type: 'video' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      assets,
      playerState: {
        inputProps: {
          imageProp: '/assets/old.png'
        },
        schema
      }
    });

    const { container } = render(<PropsEditor />);

    const input = screen.getByDisplayValue('/assets/old.png');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('list');
    expect(input).toHaveAttribute('placeholder', 'Select image or enter URL...');

    // Verify datalist options are present in the DOM
    // Note: datalist id is generated via useId, so we can't easily query by ID.
    // But we can look for options with specific values.
    // We expect ONLY the image asset to be suggested.
    const options = container.querySelectorAll('option');
    const optionValues = Array.from(options).map(o => o.value);
    expect(optionValues).toContain('/assets/image.png');
    expect(optionValues).not.toContain('/assets/video.mp4');
  });

  it('renders nested schema inputs', () => {
    const schema: HeliosSchema = {
      nestedObj: {
        type: 'object',
        properties: {
          subProp: { type: 'string', label: 'Sub Property' }
        }
      },
      listProp: {
        type: 'array',
        items: { type: 'string' }
      }
    };

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
          nestedObj: { subProp: 'sub-value' },
          listProp: ['item1', 'item2']
        },
        schema
      }
    });

    render(<PropsEditor />);

    // Check nested object
    expect(screen.getByText('Sub Property')).toBeInTheDocument();
    expect(screen.getByDisplayValue('sub-value')).toBeInTheDocument();

    // Check array items
    expect(screen.getByDisplayValue('item1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('item2')).toBeInTheDocument();

    // Check array controls
    expect(screen.getByText('+ Add Item')).toBeInTheDocument();
    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons).toHaveLength(2);
  });

  it('respects step and format props', () => {
    const schema: HeliosSchema = {
      steppedNumber: { type: 'number', minimum: 0, maximum: 10, step: 0.5 },
      dateString: { type: 'string', format: 'date' },
      colorString: { type: 'string', format: 'color' }
    };

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
          steppedNumber: 5,
          dateString: '2023-01-01',
          colorString: '#ff0000'
        },
        schema
      }
    });

    render(<PropsEditor />);

    // Check Number Step (NumberRangeInput renders both a range and a number input)
    // We can query by role 'spinbutton' for the number input
    const numberInput = screen.getByRole('spinbutton');
    expect(numberInput).toHaveValue(5);
    expect(numberInput).toHaveAttribute('step', '0.5');

    // Check Range Step (if rendered) - Range input has slider role
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('5');
    expect(slider).toHaveAttribute('step', '0.5');

    // Check Date Format
    const dateInput = screen.getByDisplayValue('2023-01-01');
    expect(dateInput).toHaveAttribute('type', 'date');

    // Check Color Format
    // In this test case, `colorString` is defined as `type: 'string', format: 'color'`.
    // So it should render as a StringInput with type="color".
    const colorInput = screen.getByDisplayValue('#ff0000');
    expect(colorInput).toHaveAttribute('type', 'color');
  });
});
