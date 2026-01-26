import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Helios } from '../../../packages/core/dist/index.js';
import { useVideoFrame } from './hooks/useVideoFrame';

const duration = 5;
const fps = 30;
const helios = new Helios({ duration, fps });

// Bind to document timeline so it can be driven by the player/renderer
helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    window.helios = helios;
}

export default function App() {
    const { currentFrame, duration, fps } = useVideoFrame(helios);

    // 1. Create a MotionValue to represent "time" or "progress"
    const progress = useMotionValue(0);

    // 2. Sync MotionValue to Helios frame on every update
    useEffect(() => {
        const p = currentFrame / (duration * fps);
        progress.set(p);
    }, [currentFrame, duration, fps, progress]);

    // 3. Drive animations using useTransform
    // Rotate 360 degrees over the full duration
    const rotate = useTransform(progress, [0, 1], [0, 360]);

    // Scale up and down
    const scale = useTransform(progress, [0, 0.5, 1], [1, 1.5, 1]);

    // Change color
    const backgroundColor = useTransform(progress, [0, 0.5, 1], ["#ff0055", "#0099ff", "#ff0055"]);

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#111',
            color: 'white',
            fontFamily: 'sans-serif',
            flexDirection: 'column'
        }}>
            <motion.div
                style={{
                    width: 150,
                    height: 150,
                    borderRadius: 30,
                    rotate,
                    scale,
                    backgroundColor
                }}
            />
            <div style={{ marginTop: 40, fontSize: 24 }}>
                Frame: {Math.round(currentFrame)} / {duration * fps}
            </div>
        </div>
    );
}
