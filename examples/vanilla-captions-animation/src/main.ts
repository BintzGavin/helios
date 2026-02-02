import { Helios } from '@helios-project/core';

const srt = `1
00:00:00,500 --> 00:00:02,500
Welcome to Helios.

2
00:00:02,800 --> 00:00:04,800
This text is driven by an SRT string.

3
00:00:05,000 --> 00:00:07,000
It works seamlessly with your animation.

4
00:00:07,500 --> 00:00:09,500
Burned directly into the video.`;

const helios = new Helios({
  duration: 10,
  fps: 30,
  captions: srt,
  autoSyncAnimations: true
});

const captionBox = document.getElementById('captions');

helios.subscribe((state) => {
  if (!captionBox) return;

  // Update Captions
  if (state.activeCaptions.length > 0) {
    // Join multiple cues with newlines if necessary
    captionBox.innerText = state.activeCaptions.map(c => c.text).join('\n');
    captionBox.style.opacity = '1';
  } else {
    captionBox.innerText = '';
    captionBox.style.opacity = '0';
  }
});

// Expose for debugging/control
(window as any).helios = helios;

helios.bindToDocumentTimeline();
