import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

function mount() {
    const root = document.getElementById('root');
    if (root) {
        ReactDOM.createRoot(root).render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
} else {
    mount();
}
