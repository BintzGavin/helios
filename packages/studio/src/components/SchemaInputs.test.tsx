import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SchemaInput, getDefaultValueForType } from './SchemaInputs';
import * as StudioContext from '../context/StudioContext';

vi.mock('../context/StudioContext', () => ({
  useStudio: vi.fn(),
}));

describe('SchemaInput Validation', () => {
  const defaultContext = {
    playerState: { fps: 30 },
    assets: []
  };

  beforeEach(() => {
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('validates string minLength', () => {
    const definition = { type: 'string', minLength: 5 };
    render(<SchemaInput definition={definition} value="abc" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('title', 'Too short');
  });

  it('validates string maxLength', () => {
    const definition = { type: 'string', maxLength: 3 };
    render(<SchemaInput definition={definition} value="abcd" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('title', 'Too long');
  });

  it('validates string pattern', () => {
    const definition = { type: 'string', pattern: '^\\\\d+$' };
    render(<SchemaInput definition={definition} value="abc" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('title', 'Pattern mismatch');
  });

  it('validates number minimum', () => {
    const definition = { type: 'number', minimum: 10 };
    render(<SchemaInput definition={definition} value={5} onChange={() => {}} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('title', 'Value too low');
  });

  it('validates number maximum', () => {
    const definition = { type: 'number', maximum: 10 };
    render(<SchemaInput definition={definition} value={15} onChange={() => {}} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('title', 'Value too high');
  });

  it('does not show error for valid inputs', () => {
    const definition = { type: 'string', minLength: 2 };
    render(<SchemaInput definition={definition} value="ok" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveClass('error');
    expect(input).not.toHaveAttribute('title');
  });
});

describe('getDefaultValueForType typed arrays', () => {
  it('returns correct default values for TypedArray types', () => {
    expect(getDefaultValueForType('int8array' as any)).toBeInstanceOf(Int8Array);
    expect(getDefaultValueForType('uint8array' as any)).toBeInstanceOf(Uint8Array);
    expect(getDefaultValueForType('uint8clampedarray' as any)).toBeInstanceOf(Uint8ClampedArray);
    expect(getDefaultValueForType('int16array' as any)).toBeInstanceOf(Int16Array);
    expect(getDefaultValueForType('uint16array' as any)).toBeInstanceOf(Uint16Array);
    expect(getDefaultValueForType('int32array' as any)).toBeInstanceOf(Int32Array);
    expect(getDefaultValueForType('uint32array' as any)).toBeInstanceOf(Uint32Array);
    expect(getDefaultValueForType('float32array' as any)).toBeInstanceOf(Float32Array);
    expect(getDefaultValueForType('float64array' as any)).toBeInstanceOf(Float64Array);
    expect(getDefaultValueForType('unknown_type' as any)).toBeUndefined();
  });
});

describe('TypedArrayInput', () => {
  const defaultContext = {
    playerState: { fps: 30 },
    assets: []
  };

  beforeEach(() => {
    (StudioContext.useStudio as any).mockReturnValue(defaultContext);
  });

  it('renders TypedArrayInput for uint32array and handles changes', () => {
    const definition = { type: 'uint32array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Uint32Array([1, 2])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: '[3, 4]' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith(new Uint32Array([3, 4]));
  });

  it('renders TypedArrayInput and shows error on invalid JSON', () => {
    const definition = { type: 'float32array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Float32Array([1.5])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '[1.5, invalid]' } });
    fireEvent.blur(textarea);

    expect(textarea).toHaveClass('error');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('instantiates the correct TypedArray for float64array', () => {
    const definition = { type: 'float64array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Float64Array([1])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '[2]' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith(new Float64Array([2]));
  });

  it('instantiates the correct TypedArray for int8array', () => {
    const definition = { type: 'int8array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Int8Array([1])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '[2]' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith(new Int8Array([2]));
  });

  it('instantiates the correct TypedArray for int16array', () => {
    const definition = { type: 'int16array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Int16Array([1])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '[2]' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith(new Int16Array([2]));
  });

  it('instantiates the correct TypedArray for int32array', () => {
    const definition = { type: 'int32array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Int32Array([1])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '[2]' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith(new Int32Array([2]));
  });

  it('instantiates the correct TypedArray for uint8array', () => {
    const definition = { type: 'uint8array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Uint8Array([1])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '[2]' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith(new Uint8Array([2]));
  });

  it('instantiates the correct TypedArray for uint8clampedarray', () => {
    const definition = { type: 'uint8clampedarray' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Uint8ClampedArray([1])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '[2]' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith(new Uint8ClampedArray([2]));
  });

  it('instantiates the correct TypedArray for uint16array', () => {
    const definition = { type: 'uint16array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Uint16Array([1])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '[2]' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith(new Uint16Array([2]));
  });

  it('instantiates the correct TypedArray for float32array', () => {
    const definition = { type: 'float32array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Float32Array([1])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '[2]' } });
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith(new Float32Array([2]));
  });

  it('rejects non-arrays in TypedArrayInput', () => {
    const definition = { type: 'float32array' };
    const onChange = vi.fn();
    render(<SchemaInput definition={definition as any} value={new Float32Array([1])} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '{"not": "array"}' } });
    fireEvent.blur(textarea);

    expect(textarea).not.toHaveClass('error'); // It handles objects without error but doesn't call onChange
    expect(onChange).not.toHaveBeenCalled();
  });
});
