import React from 'react';
import { interpolate } from '@helios-project/core';

interface TextRevealProps {
    text: string;
    frame: number;
    start: number;
    stagger?: number;
    duration?: number;
}

export function TextReveal({ text, frame, start, stagger = 5, duration = 20 }: TextRevealProps) {
    return (
        <div className="text text-reveal">
            {text.split('').map((char, i) => {
                // Calculate timing for this specific character
                const charStart = start + (i * stagger);
                const charEnd = charStart + duration;

                // Interpolate 0->1 for opacity and 20->0 for translateY
                const progress = interpolate(frame, [charStart, charEnd], [0, 1]);
                const opacity = progress;
                const translateY = (1 - progress) * 20;

                return (
                    <span
                        key={i}
                        className="char"
                        style={{
                            opacity,
                            transform: `translateY(${translateY}px)`
                        }}
                    >
                        {char === ' ' ? '\u00A0' : char}
                    </span>
                );
            })}
        </div>
    );
}
