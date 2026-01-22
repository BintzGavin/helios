export function connectToParent(helios) {
    // 1. Listen for messages from parent
    window.addEventListener('message', (event) => {
        const { type, frame } = event.data;
        switch (type) {
            case 'HELIOS_CONNECT':
                // Reply with ready and current state
                window.parent.postMessage({ type: 'HELIOS_READY' }, '*');
                window.parent.postMessage({ type: 'HELIOS_STATE', state: helios.getState() }, '*');
                break;
            case 'HELIOS_PLAY':
                helios.play();
                break;
            case 'HELIOS_PAUSE':
                helios.pause();
                break;
            case 'HELIOS_SEEK':
                if (typeof frame === 'number') {
                    helios.seek(frame);
                }
                break;
        }
    });
    // 2. Subscribe to Helios state changes and broadcast
    helios.subscribe((state) => {
        window.parent.postMessage({ type: 'HELIOS_STATE', state }, '*');
    });
    // 3. Announce readiness immediately (in case parent is already listening)
    // This helps when the iframe reloads or connects after the parent has already set up listeners
    window.parent.postMessage({ type: 'HELIOS_READY' }, '*');
}
