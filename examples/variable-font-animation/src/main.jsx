import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
import { Helios } from '../../../packages/core/src/index.ts';

const helios = new Helios({
  fps: 30,
  duration: 4, // Match animation duration
  autoSyncAnimations: true
});

helios.bindToDocumentTimeline();
window.helios = helios;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
