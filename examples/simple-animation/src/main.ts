import { Helios } from '@helios-project/core';
import './style.css';

// Initialize Helios engine
const helios = new Helios({
  duration: 5,
  fps: 30,
  autoSyncAnimations: true
});

// Expose for the Player and debugging
(window as any).helios = helios;

// Enable external control (e.g. from Renderer)
helios.bindToDocumentTimeline();
