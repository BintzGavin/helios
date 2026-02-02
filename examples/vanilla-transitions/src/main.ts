import { Helios, sequence } from '@helios-project/core';
import './style.css';

const helios = new Helios({
    fps: 30,
    duration: 7, // 210 frames
    autoSyncAnimations: true
});

// Fallback for document timeline binding
helios.bindToDocumentTimeline();

// Elements
const scene1 = document.getElementById('scene-1')!;
const scene2 = document.getElementById('scene-2')!;
const scene3 = document.getElementById('scene-3')!;

helios.subscribe((state) => {
    // Scene 1: 0 - 90 (3s)
    const s1 = sequence({ frame: state.currentFrame, from: 0, durationInFrames: 90 });
    scene1.style.display = s1.isActive ? 'flex' : 'none';

    // Scene 2: 60 - 150 (3s) - Overlaps 1s
    const s2 = sequence({ frame: state.currentFrame, from: 60, durationInFrames: 90 });
    scene2.style.display = s2.isActive ? 'flex' : 'none';

    // Scene 3: 120 - 210 (3s) - Overlaps 1s
    const s3 = sequence({ frame: state.currentFrame, from: 120, durationInFrames: 90 });
    scene3.style.display = s3.isActive ? 'flex' : 'none';
});

// Expose for debugging
(window as any).helios = helios;
