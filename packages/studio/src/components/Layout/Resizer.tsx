import React, { useState, useEffect } from 'react';
import './Resizer.css';

interface ResizerProps {
  onResize: (delta: number) => void;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export const Resizer: React.FC<ResizerProps> = ({ onResize, direction = 'horizontal', className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    let lastPosition = direction === 'horizontal' ? e.clientX : e.clientY;
    setIsDragging(true);

    const handleMove = (moveEvent: MouseEvent) => {
      const currentPosition = direction === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
      const delta = currentPosition - lastPosition;

      if (delta !== 0) {
        onResize(delta);
        lastPosition = currentPosition;
      }
    };

    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return (
    <div
      className={`resizer ${direction} ${isDragging ? 'active' : ''} ${className}`}
      onMouseDown={handleMouseDown}
    />
  );
};
