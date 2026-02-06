import { Helios } from '@helios-project/core';

// 1. Create elements
const box = document.querySelector('.box') as HTMLElement;

if (box) {
  // 2. Create WAAPI animation
  // IMPORTANT: We do not need to store the reference. Helios finds it via autoSyncAnimations.
  // We set duration to match or exceed composition, and loop it.
  box.animate(
    [
      { transform: 'translate(-50%, -50%) rotate(0deg)', backgroundColor: '#ff0055', offset: 0 },
      { transform: 'translate(calc(-50% + 100px), -50%) rotate(180deg)', backgroundColor: '#00eeff', offset: 0.5 },
      { transform: 'translate(-50%, -50%) rotate(360deg)', backgroundColor: '#ff0055', offset: 1 }
    ],
    {
      duration: 4000,
      iterations: Infinity,
      easing: 'ease-in-out'
    }
  );
}

// 3. Initialize Helios engine
const helios = new Helios({
  duration: 4,
  fps: 30,
  autoSyncAnimations: true
});

// Expose for the Player and debugging
(window as any).helios = helios;

// Enable external control (e.g. from Renderer)
helios.bindToDocumentTimeline();
