import React, { useState, useEffect, useRef } from 'react';
import { framesToTimecode, timecodeToFrames } from '@helios-project/core';
import './TimecodeDisplay.css';

interface TimecodeDisplayProps {
  frame: number;
  fps: number;
  totalFrames: number;
  onChange: (frame: number) => void;
}

export const TimecodeDisplay: React.FC<TimecodeDisplayProps> = ({ frame, fps, totalFrames, onChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Format the display timecode
  const displayTimecode = React.useMemo(() => {
    if (!fps || fps <= 0) return "00:00:00:00";
    try {
      return framesToTimecode(frame, fps);
    } catch (e) {
      return "00:00:00:00";
    }
  }, [frame, fps]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setInputValue(displayTimecode);
    setIsEditing(true);
  };

  const commit = () => {
    if (!inputValue.trim()) {
      setIsEditing(false);
      return;
    }

    let targetFrame = frame;

    try {
      if (inputValue.includes(':')) {
        // Parse as timecode
        targetFrame = timecodeToFrames(inputValue, fps);
      } else {
        // Parse as frame number
        const parsed = parseInt(inputValue, 10);
        if (!isNaN(parsed)) {
          targetFrame = parsed;
        }
      }
    } catch (e) {
      console.warn('Invalid timecode input:', inputValue);
      // Revert on error
      setIsEditing(false);
      return;
    }

    // Clamp
    targetFrame = Math.max(0, Math.min(targetFrame, totalFrames));

    if (targetFrame !== frame) {
      onChange(targetFrame);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="timecode-input"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <span
      className="timecode-display"
      onClick={handleStartEdit}
      title="Click to edit (Timecode or Frame #)"
    >
      {displayTimecode}
    </span>
  );
};
