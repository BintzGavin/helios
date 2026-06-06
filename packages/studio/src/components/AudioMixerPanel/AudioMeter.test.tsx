import React, { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { AudioMeter, AudioMeterRef, AudioLevels } from './AudioMeter';

describe('AudioMeter', () => {
  const TestWrapper = ({ initialLevels }: { initialLevels: AudioLevels }) => {
    const ref = useRef<AudioMeterRef>(null);

    // Call update immediately after mount
    React.useEffect(() => {
      if (ref.current) {
        ref.current.update(initialLevels);
      }
    }, [initialLevels]);

    return <AudioMeter ref={ref} />;
  };

  it('renders container and meter bars', () => {
    const { container } = render(
      <TestWrapper
        initialLevels={{ left: 0, right: 0, peakLeft: 0, peakRight: 0 }}
      />
    );
    expect(container.querySelector('.audio-meter-container')).toBeInTheDocument();
    expect(container.querySelectorAll('.meter-bar')).toHaveLength(2);
  });

  it('updates height and normal color (levels <= 0.8)', () => {
    const { container } = render(
      <TestWrapper
        initialLevels={{ left: 0.5, right: 0.5, peakLeft: 0.5, peakRight: 0.5 }}
      />
    );
    const bars = container.querySelectorAll('.meter-bar') as NodeListOf<HTMLElement>;

    // Left channel
    expect(bars[0].style.height).toBe('50%');
    expect(bars[0].style.backgroundColor).toBe('rgb(76, 175, 80)'); // #4caf50

    // Right channel
    expect(bars[1].style.height).toBe('50%');
    expect(bars[1].style.backgroundColor).toBe('rgb(76, 175, 80)');
  });

  it('updates warning color (levels > 0.8 and <= 0.95)', () => {
    const { container } = render(
      <TestWrapper
        initialLevels={{ left: 0.85, right: 0.85, peakLeft: 0.85, peakRight: 0.85 }}
      />
    );
    const bars = container.querySelectorAll('.meter-bar') as NodeListOf<HTMLElement>;

    // Left channel
    expect(bars[0].style.height).toBe('85%');
    expect(bars[0].style.backgroundColor).toBe('rgb(255, 179, 0)'); // #ffb300

    // Right channel
    expect(bars[1].style.height).toBe('85%');
    expect(bars[1].style.backgroundColor).toBe('rgb(255, 179, 0)');
  });

  it('updates clipping color (peaks > 0.95)', () => {
    const { container } = render(
      <TestWrapper
        initialLevels={{ left: 0.9, right: 0.9, peakLeft: 0.98, peakRight: 0.98 }}
      />
    );
    const bars = container.querySelectorAll('.meter-bar') as NodeListOf<HTMLElement>;

    // Left channel
    expect(bars[0].style.height).toBe('90%');
    expect(bars[0].style.backgroundColor).toBe('rgb(255, 82, 82)'); // #ff5252

    // Right channel
    expect(bars[1].style.height).toBe('90%');
    expect(bars[1].style.backgroundColor).toBe('rgb(255, 82, 82)');
  });

  it('handles updates after mount via ref', () => {
    let globalRef: AudioMeterRef | null = null;

    const Wrapper = () => {
      const ref = useRef<AudioMeterRef>(null);
      React.useEffect(() => {
        globalRef = ref.current;
      }, []);
      return <AudioMeter ref={ref} />;
    };

    const { container } = render(<Wrapper />);
    const bars = container.querySelectorAll('.meter-bar') as NodeListOf<HTMLElement>;

    act(() => {
      globalRef?.update({ left: 1, right: 1, peakLeft: 1, peakRight: 1 });
    });

    expect(bars[0].style.height).toBe('100%');
    expect(bars[0].style.backgroundColor).toBe('rgb(255, 82, 82)'); // Clip color due to peak = 1
  });
});
