import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { TimecodeDisplay } from './TimecodeDisplay';

describe('TimecodeDisplay', () => {
  const mockOnChange = vi.fn();
  const fps = 30;
  const totalFrames = 300; // 10s

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders timecode correctly', () => {
    // Frame 30 = 1s
    render(<TimecodeDisplay frame={30} fps={fps} totalFrames={totalFrames} onChange={mockOnChange} />);
    expect(screen.getByText('00:00:01:00')).toBeInTheDocument();
  });

  it('switches to input on click', () => {
    render(<TimecodeDisplay frame={30} fps={fps} totalFrames={totalFrames} onChange={mockOnChange} />);
    const display = screen.getByText('00:00:01:00');
    fireEvent.click(display);

    const input = screen.getByDisplayValue('00:00:01:00');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('commits frame number change on enter', () => {
    render(<TimecodeDisplay frame={30} fps={fps} totalFrames={totalFrames} onChange={mockOnChange} />);
    const display = screen.getByText('00:00:01:00');
    fireEvent.click(display);

    const input = screen.getByDisplayValue('00:00:01:00');
    // Change to "60" (frame number)
    fireEvent.change(input, { target: { value: '60' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnChange).toHaveBeenCalledWith(60);
    // Should revert to span
    expect(screen.queryByDisplayValue('60')).not.toBeInTheDocument();
  });

  it('commits timecode change on enter', () => {
    render(<TimecodeDisplay frame={30} fps={fps} totalFrames={totalFrames} onChange={mockOnChange} />);
    const display = screen.getByText('00:00:01:00');
    fireEvent.click(display);

    const input = screen.getByDisplayValue('00:00:01:00');
    // Change to "00:00:02:00" (Frame 60)
    fireEvent.change(input, { target: { value: '00:00:02:00' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnChange).toHaveBeenCalledWith(60);
  });

  it('clamps value to totalFrames', () => {
    render(<TimecodeDisplay frame={30} fps={fps} totalFrames={totalFrames} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('00:00:01:00'));
    const input = screen.getByDisplayValue('00:00:01:00');

    fireEvent.change(input, { target: { value: '1000' } });
    fireEvent.blur(input);

    expect(mockOnChange).toHaveBeenCalledWith(300); // totalFrames
  });

  it('reverts on invalid input', () => {
    render(<TimecodeDisplay frame={30} fps={fps} totalFrames={totalFrames} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('00:00:01:00'));
    const input = screen.getByDisplayValue('00:00:01:00');

    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    expect(mockOnChange).not.toHaveBeenCalled();
    // Should revert to original display
    expect(screen.getByText('00:00:01:00')).toBeInTheDocument();
  });
});
