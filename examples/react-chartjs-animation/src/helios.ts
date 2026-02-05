import { Helios } from '@helios-project/core';

export const helios = new Helios({
  duration: 10,
  fps: 30,
  width: 1920,
  height: 1080,
  autoSyncAnimations: false
});

helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    (window as any).helios = helios;
}
