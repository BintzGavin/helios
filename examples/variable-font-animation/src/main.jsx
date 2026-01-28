import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Helios } from '../../../packages/core/src/index.ts';

// Initialize Helios with autoSyncAnimations: true
// This will automatically sync CSS animations and transitions to the Helios timeline
const helios = new Helios({
    fps: 30,
    duration: 4, // Matches the 4s animation
    autoSyncAnimations: true
});

helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
    window.helios = helios;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
