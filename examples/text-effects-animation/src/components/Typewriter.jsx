import React from 'react';
import { interpolate } from '/packages/core/src/index.ts';

export function Typewriter({ text, frame, start, end }) {
    // Calculate how many characters to show
    // We map [start, end] frames to [0, text.length] characters
    const visibleCount = Math.floor(interpolate(frame, [start, end], [0, text.length]));

    // Ensure we don't slice beyond bounds
    const safeCount = Math.max(0, Math.min(text.length, visibleCount));

    return (
        <div className="text typewriter">
            {text.slice(0, safeCount)}
            <span style={{ opacity: frame >= start && frame < end && frame % 10 < 5 ? 1 : 0 }}>|</span>
        </div>
    );
}
