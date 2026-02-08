// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { RenderConfig, type RenderConfigData } from './RenderConfig';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

describe('RenderConfig', () => {
  const defaultConfig: RenderConfigData = {
    mode: 'canvas',
    concurrency: 1
  };

  const mockOnChange = vi.fn();

  it('renders all config fields', () => {
    render(<RenderConfig config={defaultConfig} onChange={mockOnChange} />);

    expect(screen.getByText('Preset')).toBeInTheDocument();
    expect(screen.getByText('Mode')).toBeInTheDocument();
    expect(screen.getByText('Video Bitrate')).toBeInTheDocument();
    expect(screen.getByText('Video Codec')).toBeInTheDocument();
    expect(screen.getByText('Concurrency (Workers)')).toBeInTheDocument();
    expect(screen.getByText('Hardware Acceleration')).toBeInTheDocument();
    expect(screen.getByText('Resolution Scale')).toBeInTheDocument();
  });

  it('applies preset values when selected', () => {
    render(<RenderConfig config={defaultConfig} onChange={mockOnChange} />);

    const presetSelect = screen.getByRole('combobox', { name: /preset/i });

    // Changing the select value
    fireEvent.change(presetSelect, { target: { value: 'HD (1080p)' } });

    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'canvas',
      videoBitrate: '5000k',
      videoCodec: 'libx264'
    }));
  });

  it('detects active preset based on values', () => {
    const hdConfig: RenderConfigData = {
      mode: 'canvas',
      videoBitrate: '5000k',
      videoCodec: 'libx264',
      concurrency: 1 // Concurrency isn't part of HD preset definition in the component, so it shouldn't affect matching if implementation ignores extras?
      // Wait, let's check implementation:
      // isMatch = Object.entries(preset).every(([key, value]) => config[key] === value);
      // So extra keys in config don't matter.
    };

    render(<RenderConfig config={hdConfig} onChange={mockOnChange} />);

    const presetSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    expect(presetSelect.value).toBe('HD (1080p)');
  });

  it('shows "Custom" when values do not match any preset', () => {
    const customConfig: RenderConfigData = {
      mode: 'canvas',
      videoBitrate: '1234k', // Custom bitrate
      videoCodec: 'libx264'
    };

    render(<RenderConfig config={customConfig} onChange={mockOnChange} />);

    const presetSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    expect(presetSelect.value).toBe('Custom');
  });

  it('updates individual fields', () => {
    render(<RenderConfig config={defaultConfig} onChange={mockOnChange} />);

    const bitrateInput = screen.getByPlaceholderText('e.g. 5M, 1000k');
    fireEvent.change(bitrateInput, { target: { value: '8000k' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultConfig,
      videoBitrate: '8000k'
    });
  });

  it('clamps concurrency values between 1 and 32', () => {
    render(<RenderConfig config={defaultConfig} onChange={mockOnChange} />);

    const concurrencyInput = screen.getByLabelText('Concurrency (Workers)');

    // Test negative value -> should be clamped to 1
    fireEvent.change(concurrencyInput, { target: { value: '-5' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultConfig,
      concurrency: 1
    });

    // Test excessive value -> should be clamped to 32
    fireEvent.change(concurrencyInput, { target: { value: '100' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultConfig,
      concurrency: 32
    });
  });

  it('updates hwAccel and scale', () => {
    render(<RenderConfig config={defaultConfig} onChange={mockOnChange} />);

    const hwAccelSelect = screen.getByLabelText('Hardware Acceleration');
    fireEvent.change(hwAccelSelect, { target: { value: 'cuda' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultConfig,
      hwAccel: 'cuda'
    });

    const scaleSelect = screen.getByLabelText('Resolution Scale');
    fireEvent.change(scaleSelect, { target: { value: '0.5' } });
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultConfig,
      scale: 0.5
    });
  });
});
