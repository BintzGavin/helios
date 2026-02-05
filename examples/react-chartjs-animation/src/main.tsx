import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './helios'; // Initialize helios

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
