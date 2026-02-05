import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export interface AudioLevels {
  left: number;
  right: number;
  peakLeft: number;
  peakRight: number;
}

export interface AudioMeterRef {
  update: (levels: AudioLevels) => void;
}

export const AudioMeter = forwardRef<AudioMeterRef>((_, ref) => {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    update: (levels: AudioLevels) => {
      if (leftRef.current) {
        const lPct = Math.min(100, levels.left * 100);
        leftRef.current.style.height = `${lPct}%`;

        if (levels.peakLeft > 0.95) {
             leftRef.current.style.backgroundColor = '#ff5252'; // Clip
        } else if (levels.left > 0.8) {
             leftRef.current.style.backgroundColor = '#ffb300'; // Warning
        } else {
             leftRef.current.style.backgroundColor = '#4caf50'; // Normal
        }
      }
      if (rightRef.current) {
        const rPct = Math.min(100, levels.right * 100);
        rightRef.current.style.height = `${rPct}%`;

        if (levels.peakRight > 0.95) {
             rightRef.current.style.backgroundColor = '#ff5252';
        } else if (levels.right > 0.8) {
             rightRef.current.style.backgroundColor = '#ffb300';
        } else {
             rightRef.current.style.backgroundColor = '#4caf50';
        }
      }
    }
  }));

  return (
    <div className="audio-meter-container" title="Master Levels">
      <div className="meter-channel">
        <div ref={leftRef} className="meter-bar" />
      </div>
      <div className="meter-channel">
        <div ref={rightRef} className="meter-bar" />
      </div>
    </div>
  );
});

AudioMeter.displayName = 'AudioMeter';
