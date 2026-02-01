import { Helios, interpolate, spring } from '@helios-project/core';

// Initialize Helios
const helios = new Helios({
  fps: 30,
  duration: 5,
  autoSyncAnimations: true
});

const app = document.getElementById('app')!;
app.style.padding = '20px';

// Title
const title = document.createElement('h1');
title.textContent = 'Vanilla Animation Helpers';
app.appendChild(title);

// --- Series Container ---
const seriesContainer = document.createElement('div');
seriesContainer.style.position = 'relative';
seriesContainer.style.width = '100%';
seriesContainer.style.height = '150px';
seriesContainer.style.marginBottom = '50px';
app.appendChild(seriesContainer);

// Create Sequence Boxes
function createBox(color: string, text: string) {
    const box = document.createElement('div');
    box.className = 'box';
    box.style.backgroundColor = color;
    box.textContent = text;
    box.style.position = 'absolute'; // For positioning in sequence
    box.style.display = 'none'; // Hidden by default
    return box;
}

const seq1 = createBox('red', 'Seq 1');
seriesContainer.appendChild(seq1);

const seq2 = createBox('blue', 'Seq 2');
seriesContainer.appendChild(seq2);

const seq3Wrapper = document.createElement('div');
seq3Wrapper.style.display = 'none';
seq3Wrapper.style.position = 'absolute';
seq3Wrapper.style.color = 'white';
seriesContainer.appendChild(seq3Wrapper);
const seq3Title = document.createElement('div');
seq3Title.textContent = 'Wrapper (60-120)';
seq3Wrapper.appendChild(seq3Title);

const nested1 = createBox('green', 'Nested 1');
nested1.style.position = 'static'; // Inside wrapper flow
nested1.style.marginTop = '10px';
seq3Wrapper.appendChild(nested1);


// --- Helper Demo Box ---
const helperBox = document.createElement('div');
helperBox.className = 'box';
helperBox.style.backgroundColor = 'hotpink';
helperBox.textContent = 'Helpers';
helperBox.style.position = 'absolute';
helperBox.style.top = '250px';
helperBox.style.left = '50px';
app.appendChild(helperBox);

// Subscribe to updates
helios.subscribe((state) => {
    const { currentFrame } = state;

    // --- Helpers Demo ---
    // Interpolate x position: 0 -> 200 over frames 0-60
    const x = interpolate(currentFrame, [0, 60], [0, 200], { extrapolateRight: 'clamp' });

    // Spring scale: 0 -> 1 starting at frame 0
    const scale = spring({ frame: currentFrame, fps: 30, from: 0, to: 1, config: { stiffness: 100 } });

    helperBox.style.transform = `translateX(${x}px) scale(${scale})`;


    // --- Manual Sequencing Logic ---

    // Sequence 1: 0 - 30
    if (currentFrame >= 0 && currentFrame < 30) {
        seq1.style.display = 'flex';
    } else {
        seq1.style.display = 'none';
    }

    // Sequence 2: 30 - 60
    if (currentFrame >= 30 && currentFrame < 60) {
        seq2.style.display = 'flex';
    } else {
        seq2.style.display = 'none';
    }

    // Sequence 3 (Wrapper): 60 - 120
    if (currentFrame >= 60 && currentFrame < 120) {
        seq3Wrapper.style.display = 'block';

        // Nested Sequence 1: relative 0-30 (absolute 60-90)
        if (currentFrame >= 60 && currentFrame < 90) {
            nested1.style.display = 'flex';
        } else {
            nested1.style.display = 'none';
        }

    } else {
        seq3Wrapper.style.display = 'none';
    }
});

// Enable timeline sync
helios.bindToDocumentTimeline();

// Expose for debugging and verification tools
(window as any).helios = helios;
