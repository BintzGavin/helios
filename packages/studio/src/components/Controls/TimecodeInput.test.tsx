import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TimecodeInput } from './TimecodeInput';
import { framesToTimecode, timecodeToFrames } from '@helios-project/core';

vi.mock('@helios-project/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@helios-project/core')>();
  return {
    ...actual,
    framesToTimecode: vi.fn(actual.framesToTimecode),
  };
});

describe('TimecodeInput', () => {
  const mockOnChange = vi.fn();
  const fps = 30;

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders timecode correctly based on value and fps', () => {
    // 1 second = 30 frames -> 00:00:01:00
    render(<TimecodeInput value={1} fps={fps} onChange={mockOnChange} />);
    expect(screen.getByDisplayValue('00:00:01:00')).toBeInTheDocument();
  });

  it('updates text when user types', () => {
    render(<TimecodeInput value={1} fps={fps} onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('00:00:01:00');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '00:00:02:00' } });
    expect(screen.getByDisplayValue('00:00:02:00')).toBeInTheDocument();
  });

  it('commits change and calls onChange with parsed timecode on blur', () => {
    render(<TimecodeInput value={1} fps={fps} onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('00:00:01:00');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '00:00:02:00' } });
    fireEvent.blur(input);

    // 00:00:02:00 -> 60 frames -> value = 60 / 30 = 2
    expect(mockOnChange).toHaveBeenCalledWith(2);
  });

  it('commits change with frame number input on blur', () => {
    render(<TimecodeInput value={1} fps={fps} onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('00:00:01:00');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '90' } });
    fireEvent.blur(input);

    // 90 frames -> value = 90 / 30 = 3
    expect(mockOnChange).toHaveBeenCalledWith(3);
  });



  it('handles error state gracefully on invalid timecode with undefined value', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Test with missing value so (value || 0) hits the 0 fallback
    render(<TimecodeInput value={undefined as any} fps={fps} onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('00:00:00:00');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'invalid-timecode' } });
    fireEvent.blur(input);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('00:00:00:00')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('reverts to original value with undefined value when Escape is pressed', () => {
    render(<TimecodeInput value={undefined as any} fps={fps} onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('00:00:00:00');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '00:00:03:00' } });

    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(screen.getByDisplayValue('00:00:00:00')).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('handles error state gracefully on invalid timecode', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<TimecodeInput value={1} fps={fps} onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('00:00:01:00');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'invalid-timecode' } });
    fireEvent.blur(input);

    expect(mockOnChange).not.toHaveBeenCalled();
    // Reverts to original value on error blur
    expect(screen.getByDisplayValue('00:00:01:00')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('blurs the input when Enter is pressed', () => {
    render(<TimecodeInput value={1} fps={fps} onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('00:00:01:00');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '00:00:03:00' } });

    const blurSpy = vi.spyOn(input, 'blur');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(blurSpy).toHaveBeenCalled();
  });

  it('reverts to original value and stops editing when Escape is pressed', () => {
    render(<TimecodeInput value={1} fps={fps} onChange={mockOnChange} />);
    const input = screen.getByDisplayValue('00:00:01:00');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '00:00:03:00' } });

    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(screen.getByDisplayValue('00:00:01:00')).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('falls back to 00:00:00:00 when value is undefined/error in rendering', () => {
    vi.mocked(framesToTimecode).mockImplementationOnce(() => {
      throw new Error("Mocked parsing error");
    });

    render(<TimecodeInput value={NaN} fps={fps} onChange={mockOnChange} />);

    expect(screen.getByDisplayValue('00:00:00:00')).toBeInTheDocument();
  });
});
