import { Helios } from '@helios-project/core';

console.log('Helios initializing...');

export const helios = new Helios({
  fps: 60,
  width: 1920,
  height: 1080,
  autoStart: false
});

helios.bindToDocumentTimeline();

// Expose for debugging
(window as any).helios = helios;

console.log('Helios initialized and bound.');
