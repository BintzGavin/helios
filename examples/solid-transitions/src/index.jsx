import { render } from 'solid-js/web';
import { Helios } from '@helios-project/core';
import App from './App';
import './style.css';

// Initialize Helios
const helios = new Helios({
  duration: 4, // 120 frames
  fps: 30,
  autoSyncAnimations: true // Crucial for this example
});

helios.bindToDocumentTimeline();

// Expose to window for debugging/control
if (typeof window !== 'undefined') {
  window.helios = helios;
}

render(() => <App helios={helios} />, document.getElementById('root'));
