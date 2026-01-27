import React from 'react'
import ReactDOM from 'react-dom/client'
import { Helios } from '../../../packages/core/src/index';
import App from './App.jsx'
import './index.css'

// Initialize Helios with autoSyncAnimations: true
// This is critical for Tailwind/CSS animations to be captured correctly
const helios = new Helios({
  width: 1920,
  height: 1080,
  fps: 30,
  autoSyncAnimations: true
});

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    window.helios = helios;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
