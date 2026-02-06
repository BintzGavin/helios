import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SchemaInput } from './SchemaInputs';
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
    // "abc" is length 3, should fail
    render(<SchemaInput definition={definition} value="abc" onChange={() => {}} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('title', 'Too short');
  });

  it('validates string maxLength', () => {
    const definition = { type: 'string', maxLength: 3 };
    // "abcd" is length 4, should fail
    render(<SchemaInput definition={definition} value="abcd" onChange={() => {}} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('title', 'Too long');
  });

  it('validates string pattern', () => {
    const definition = { type: 'string', pattern: '^\\d+$' };
    // "abc" does not match digits, should fail
    render(<SchemaInput definition={definition} value="abc" onChange={() => {}} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('title', 'Pattern mismatch');
  });

  it('validates number minimum', () => {
    const definition = { type: 'number', minimum: 10 };
    // 5 is less than 10, should fail
    render(<SchemaInput definition={definition} value={5} onChange={() => {}} />);

    // NumberRangeInput renders a number input (spinbutton)
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveClass('error');
    expect(input).toHaveAttribute('title', 'Value too low');
  });

  it('validates number maximum', () => {
    const definition = { type: 'number', maximum: 10 };
    // 15 is greater than 10, should fail
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
