import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Helios } from '../../../packages/core/src/index.ts';

const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

// Attach to window for convenience/debugging
if (typeof window !== 'undefined') {
  window.helios = helios;
}

function mount() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App helios={helios} />
      </React.StrictMode>,
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
