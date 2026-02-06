import { Helios } from '@helios-project/core';
import { animate } from 'motion';

// 1. Initialize Helios with autoSyncAnimations: true
// This tells Helios to find all WAAPI animations on the page and control their currentTime.
const helios = new Helios({
  fps: 30,
  duration: 4,
  autoSyncAnimations: true
});

// 2. Create a Motion One animation
// Motion One uses WAAPI under the hood, so Helios should find this automatically.
// We do NOT need to keep a reference or manually subscribe.
animate(".box",
  {
    x: [0, 200, 0, -200, 0],
    rotate: [0, 90, 180, 270, 360],
    backgroundColor: ["#ff0055", "#00eeff", "#ff0055"]
  },
  {
    duration: 4,
    easing: "ease-in-out"
  }
);

// 3. Bind to document timeline for preview
helios.bindToDocumentTimeline();

// Expose for debugging
(window as any).helios = helios;
