import { captureDomToBitmap } from "./features/dom-capture";
import { getAudioAssets } from "./features/audio-utils";
export function connectToParent(helios) {
    // 1. Listen for messages from parent
    window.addEventListener('message', async (event) => {
        const { type, frame } = event.data;
        switch (type) {
            case 'HELIOS_GET_AUDIO_TRACKS':
                const assets = await getAudioAssets(document);
                const buffers = assets.map(a => a.buffer);
                window.parent.postMessage({ type: 'HELIOS_AUDIO_DATA', assets }, '*', buffers);
                break;
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
            case 'HELIOS_SET_VOLUME':
                if (typeof event.data.volume === 'number') {
                    helios.setAudioVolume(event.data.volume);
                }
                break;
            case 'HELIOS_SET_MUTED':
                if (typeof event.data.muted === 'boolean') {
                    helios.setAudioMuted(event.data.muted);
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
    const { frame, selector, mode } = data;
    // 1. Seek
    helios.seek(frame);
    // 2. Wait for render (double RAF to be safe and ensure paint)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const state = helios.getState();
    const captions = state.activeCaptions || [];
    // 3. DOM Mode
    if (mode === 'dom') {
        try {
            const bitmap = await captureDomToBitmap(document.body);
            window.parent.postMessage({
                type: 'HELIOS_FRAME_DATA',
                frame,
                success: true,
                bitmap,
                captions
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
        return;
    }
    // 4. Canvas Mode (Default)
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
            bitmap,
            captions
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
