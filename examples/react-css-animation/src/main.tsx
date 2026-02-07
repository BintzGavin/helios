import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
import { Helios } from '@helios-project/core';

// Initialize Helios with autoSyncAnimations: true
// This tells Helios to hijack all CSS animations on the page
const helios = new Helios({
  fps: 30,
  duration: 5,
  autoSyncAnimations: true
});

helios.bindToDocumentTimeline();
(window as any).helios = helios;

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
