export function connectToParent(helios) {
    // 1. Listen for messages from parent
    window.addEventListener('message', (event) => {
        const { type, frame } = event.data;
        switch (type) {
            case 'HELIOS_CONNECT':
                // Reply with ready and current state
                window.parent.postMessage({ type: 'HELIOS_READY', state: helios.getState() }, '*');
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
            case 'HELIOS_SET_PLAYBACK_RATE':
                if (typeof event.data.rate === 'number') {
                    helios.setPlaybackRate(event.data.rate);
                }
                break;
            case 'HELIOS_SET_PROPS':
                if (event.data.props) {
                    helios.setInputProps(event.data.props);
                }
                break;
            case 'HELIOS_CAPTURE_FRAME':
                handleCaptureFrame(helios, event.data);
                break;
        }
    });
    // 2. Announce readiness immediately (in case parent is already listening)
    // This helps when the iframe reloads or connects after the parent has already set up listeners
    window.parent.postMessage({ type: 'HELIOS_READY', state: helios.getState() }, '*');
    // 3. Subscribe to Helios state changes and broadcast
    helios.subscribe((state) => {
        window.parent.postMessage({ type: 'HELIOS_STATE', state }, '*');
    });
}
async function handleCaptureFrame(helios, data) {
    const { frame, selector } = data;
    // 1. Seek
    helios.seek(frame);
    // 2. Wait for render (double RAF to be safe and ensure paint)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    // 3. Find canvas
    const canvas = document.querySelector(selector || 'canvas');
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
        window.parent.postMessage({
            type: 'HELIOS_FRAME_DATA',
            frame,
            success: false,
            error: 'Canvas not found'
        }, '*');
        return;
    }
    // 4. Create Bitmap
    try {
        const bitmap = await createImageBitmap(canvas);
        // 5. Send back
        window.parent.postMessage({
            type: 'HELIOS_FRAME_DATA',
            frame,
            success: true,
            bitmap
        }, '*', [bitmap]);
    }
    catch (e) {
        window.parent.postMessage({
            type: 'HELIOS_FRAME_DATA',
            frame,
            success: false,
            error: e.message
        }, '*');
    }
}
