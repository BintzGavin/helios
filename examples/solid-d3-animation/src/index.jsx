/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { Helios } from '@helios-project/core';

// Initialize Helios
window.helios = new Helios({
  width: 1920,
  height: 1080,
  autoSyncAnimations: false, // We will manually drive D3
  fps: 60,
  duration: 60 // Default duration
});

// Bind to document timeline for simple playback control
window.helios.bindToDocumentTimeline();

render(() => <App />, document.getElementById('root'));
