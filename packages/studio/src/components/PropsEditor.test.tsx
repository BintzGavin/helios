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

  it('groups props based on schema group property', () => {
    const schema: HeliosSchema = {
      ungrouped1: { type: 'string' },
      grouped1: { type: 'string', group: 'My Group' },
      grouped2: { type: 'number', group: 'My Group' },
      ungrouped2: { type: 'boolean' },
      anotherGrouped: { type: 'string', group: 'Other Group' }
    };

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
          ungrouped1: 'val1',
          grouped1: 'val2',
          grouped2: 123,
          ungrouped2: true,
          anotherGrouped: 'val3'
        },
        schema
      }
    });

    render(<PropsEditor />);

    // Verify groups exist (headers)
    expect(screen.getByText('My Group')).toBeInTheDocument();
    expect(screen.getByText('Other Group')).toBeInTheDocument();

    // Verify props are rendered
    expect(screen.getByDisplayValue('val1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('val2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('val3')).toBeInTheDocument();

    // Verify structure via interaction (collapsing group)
    const myGroupHeader = screen.getByText('My Group');
    fireEvent.click(myGroupHeader);

    // After collapse, val2 and 123 should be hidden
    expect(screen.queryByDisplayValue('val2')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('123')).not.toBeInTheDocument();

    // Ungrouped should still be visible
    expect(screen.getByDisplayValue('val1')).toBeInTheDocument();

    // Other group should still be visible
    expect(screen.getByDisplayValue('val3')).toBeInTheDocument();

    // Click again to expand
    fireEvent.click(myGroupHeader);
    expect(screen.getByDisplayValue('val2')).toBeInTheDocument();
  });

  it('renders TypedArray inputs', () => {
    const schema: HeliosSchema = {
      floatArray: { type: 'float32array' },
      intArray: { type: 'int8array' }
    };

    // Use simple values to avoid float precision issues in text matching
    const initialFloatArray = new Float32Array([1, 2, 3]);
    const initialIntArray = new Int8Array([10, 20]);

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
          floatArray: initialFloatArray,
          intArray: initialIntArray
        },
        schema
      }
    });

    render(<PropsEditor />);

    // Verify JSON content is rendered
    // JsonInput formats with indentation (2 spaces)
    const floatJson = JSON.stringify(Array.from(initialFloatArray), null, 2);
    const intJson = JSON.stringify(Array.from(initialIntArray), null, 2);

    // Get all textareas (JsonInputs)
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);

    // Verify values (normalize newlines just in case)
    expect(inputs[0]).toHaveValue(floatJson);
    expect(inputs[1]).toHaveValue(intJson);

    // Update FloatArray
    const newFloatArray = [4, 5, 6];
    const newFloatJson = JSON.stringify(newFloatArray, null, 2);

    // Find the textarea for floatArray (first one)
    const floatInput = inputs[0];
    fireEvent.change(floatInput, { target: { value: newFloatJson } });
    fireEvent.blur(floatInput); // JsonInput updates on blur

    // Verify setInputProps called with correct TypedArray
    expect(mockSetInputProps).toHaveBeenCalledWith(
        expect.objectContaining({
            floatArray: expect.any(Float32Array)
        })
    );

    // Check content of the called argument
    const callArgs = mockSetInputProps.mock.calls[0][0];
    expect(Array.from(callArgs.floatArray)).toEqual(newFloatArray);
  });

  it('renders string inputs with constraints', () => {
    const schema: HeliosSchema = {
      constrainedString: {
        type: 'string',
        minLength: 5,
        maxLength: 10,
        pattern: '^[a-z]+$'
      }
    };

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
          constrainedString: 'hello'
        },
        schema
      }
    });

    render(<PropsEditor />);

    const input = screen.getByDisplayValue('hello');
    expect(input).toHaveAttribute('minLength', '5');
    expect(input).toHaveAttribute('maxLength', '10');
    expect(input).toHaveAttribute('pattern', '^[a-z]+$');
    expect(input).toHaveAttribute('title', 'Must match pattern: ^[a-z]+$');
  });

  it('renders array inputs with size constraints', () => {
    const schema: HeliosSchema = {
      constrainedList: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 3
      }
    };

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
          constrainedList: ['a', 'b', 'c'] // Max items reached
        },
        schema
      }
    });

    render(<PropsEditor />);

    // Max items reached (3 == 3). Add button should not be present.
    expect(screen.queryByText('+ Add Item')).not.toBeInTheDocument();
  });

  it('disables remove button when minItems reached', () => {
     const schema: HeliosSchema = {
      constrainedList: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2
      }
    };

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
          constrainedList: ['a', 'b'] // length 2 == minItems
        },
        schema
      }
    });

    render(<PropsEditor />);

    const removeButtons = screen.getAllByText('Remove');
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]).toBeDisabled();
    expect(removeButtons[1]).toBeDisabled();

    // Add button should be present (no maxItems)
    expect(screen.getByText('+ Add Item')).toBeInTheDocument();
  });

  it('renders asset inputs with accept constraint', () => {
    const schema: HeliosSchema = {
      imageProp: {
          type: 'image',
          accept: ['.png'] // Only PNGs
      }
    };

    const assets = [
      { id: '1', name: 'image.png', url: '/assets/image.png', type: 'image' },
      { id: '2', name: 'image.jpg', url: '/assets/image.jpg', type: 'image' }
    ];

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      assets,
      playerState: {
        inputProps: {
          imageProp: '/assets/image.png'
        },
        schema
      }
    });

    const { container } = render(<PropsEditor />);

    // We expect ONLY the .png image asset to be suggested.
    const options = container.querySelectorAll('option');
    const optionValues = Array.from(options).map(o => o.value);
    expect(optionValues).toContain('/assets/image.png');
    expect(optionValues).not.toContain('/assets/image.jpg');
  });

  it('reorders array items', () => {
    const schema: HeliosSchema = {
      listProp: {
        type: 'array',
        items: { type: 'string' }
      }
    };

    (StudioContext.useStudio as any).mockReturnValue({
      ...defaultContext,
      playerState: {
        inputProps: {
          listProp: ['A', 'B', 'C']
        },
        schema
      }
    });

    render(<PropsEditor />);

    // Check initial order
    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveValue('A');
    expect(inputs[1]).toHaveValue('B');
    expect(inputs[2]).toHaveValue('C');

    // Find "Move Down" button for first item ('A')
    const downButtons = screen.getAllByTitle('Move Down');
    const upButtons = screen.getAllByTitle('Move Up');

    // First item 'A' (index 0)
    // Up should be disabled
    expect(upButtons[0]).toBeDisabled();
    // Down should be enabled
    expect(downButtons[0]).not.toBeDisabled();

    // Click Down on 'A' -> should become ['B', 'A', 'C']
    fireEvent.click(downButtons[0]);
    expect(mockSetInputProps).toHaveBeenCalledWith({ listProp: ['B', 'A', 'C'] });

    // Last item 'C' (index 2)
    // Down should be disabled
    expect(downButtons[2]).toBeDisabled();
    // Up should be enabled
    expect(upButtons[2]).not.toBeDisabled();

    // Click Up on 'C' -> should become ['A', 'C', 'B'] (assuming starting from original ['A', 'B', 'C'])
    fireEvent.click(upButtons[2]);
    expect(mockSetInputProps).toHaveBeenCalledWith({ listProp: ['A', 'C', 'B'] });
  });
});
