import React, { useState, useEffect, KeyboardEvent } from 'react';
import { framesToTimecode, timecodeToFrames } from '@helios-project/core';
import './TimecodeInput.css';

interface TimecodeInputProps {
  value: number; // in seconds
  fps: number;
  onChange: (value: number) => void;
}

export const TimecodeInput: React.FC<TimecodeInputProps> = ({ value, fps, onChange }) => {
  const [text, setText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(false);

  // Sync with prop value when not editing
  useEffect(() => {
    if (!isEditing) {
      try {
        const frame = Math.round((value || 0) * fps);
        setText(framesToTimecode(frame, fps));
        setError(false);
      } catch (e) {
        setText("00:00:00:00");
      }
    }
  }, [value, fps, isEditing]);

  const parseTimecode = (input: string, fps: number): number => {
      // Try strict parsing first
      try {
          return timecodeToFrames(input, fps);
      } catch (e) {
          // Fallback: try to be more lenient?
          // For now, let's allow partial inputs like "10:00" -> "00:00:10:00" ?
          // Or just standard "SS:FF" -> "00:00:SS:FF"

          // Regex for just numbers (frames)
          if (/^\d+$/.test(input)) {
              return parseInt(input, 10);
          }

          throw e;
      }
  };

  const commitChange = () => {
    try {
      const frames = parseTimecode(text, fps);
      onChange(frames / fps);
      setError(false);
      setIsEditing(false);
    } catch (e) {
      console.warn("Invalid timecode:", text);
      setError(true);
      // Don't leave edit mode on error, or revert?
      // Reverting behavior:
      const frame = Math.round((value || 0) * fps);
      setText(framesToTimecode(frame, fps));
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      const frame = Math.round((value || 0) * fps);
      setText(framesToTimecode(frame, fps));
      setError(false);
    }
  };

  return (
    <div className={`timecode-input-container ${error ? 'invalid' : ''}`}>
      <input
        className={`timecode-input ${error ? 'invalid' : ''}`}
        type="text"
        value={text}
        onChange={(e) => {
             setText(e.target.value);
             setError(false);
        }}
        onFocus={() => setIsEditing(true)}
        onBlur={commitChange}
        onKeyDown={handleKeyDown}
        placeholder="HH:MM:SS:FF"
      />
      <span className="timecode-input-fps">{fps}fps</span>
    </div>
  );
};
