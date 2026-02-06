import { Helios } from "@helios-project/core";
import { captureDomToBitmap } from "./features/dom-capture";
import { getAudioAssets } from "./features/audio-utils";
import { AudioMeter } from "./features/audio-metering";
export function connectToParent(helios) {
    let audioMeter = null;
    let audioMeterRaf = null;
    // 1. Listen for messages from parent
    window.addEventListener('message', async (event) => {
        if (event.source !== window.parent)
            return;
        const { type, frame } = event.data;
        switch (type) {
            case 'HELIOS_GET_AUDIO_TRACKS':
                const state = helios.getState();
                const assets = await getAudioAssets(document, state.availableAudioTracks, state.audioTracks);
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
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            window.parent.postMessage({ type: 'HELIOS_SEEK_DONE', frame }, '*');
                        });
                    });
                }
                break;
            case 'HELIOS_SET_PLAYBACK_RATE':
                if (typeof event.data.rate === 'number') {
                    helios.setPlaybackRate(event.data.rate);
                }
                break;
            case 'HELIOS_SET_PLAYBACK_RANGE':
                const { start, end } = event.data;
                if (typeof start === 'number' && typeof end === 'number') {
                    helios.setPlaybackRange(start, end);
                }
                break;
            case 'HELIOS_CLEAR_PLAYBACK_RANGE':
                helios.clearPlaybackRange();
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
            case 'HELIOS_SET_AUDIO_TRACK_VOLUME':
                if (typeof event.data.trackId === 'string' && typeof event.data.volume === 'number') {
                    helios.setAudioTrackVolume(event.data.trackId, event.data.volume);
                }
                break;
            case 'HELIOS_SET_AUDIO_TRACK_MUTED':
                if (typeof event.data.trackId === 'string' && typeof event.data.muted === 'boolean') {
                    helios.setAudioTrackMuted(event.data.trackId, event.data.muted);
                }
                break;
            case 'HELIOS_SET_LOOP':
                if (typeof event.data.loop === 'boolean') {
                    helios.setLoop(event.data.loop);
                }
                break;
            case 'HELIOS_SET_PROPS':
                if (event.data.props) {
                    helios.setInputProps(event.data.props);
                }
                break;
            case 'HELIOS_SET_CAPTIONS':
                if (event.data.captions !== undefined) {
                    helios.setCaptions(event.data.captions);
                }
                break;
            case 'HELIOS_SET_DURATION':
                if (typeof event.data.duration === 'number') {
                    helios.setDuration(event.data.duration);
                }
                break;
            case 'HELIOS_SET_FPS':
                if (typeof event.data.fps === 'number') {
                    helios.setFps(event.data.fps);
                }
                break;
            case 'HELIOS_SET_SIZE':
                if (typeof event.data.width === 'number' && typeof event.data.height === 'number') {
                    helios.setSize(event.data.width, event.data.height);
                }
                break;
            case 'HELIOS_SET_MARKERS':
                if (Array.isArray(event.data.markers)) {
                    helios.setMarkers(event.data.markers);
                }
                break;
            case 'HELIOS_GET_SCHEMA':
                window.parent.postMessage({ type: 'HELIOS_SCHEMA', schema: helios.schema }, '*');
                break;
            case 'HELIOS_START_METERING':
                if (!audioMeter) {
                    audioMeter = new AudioMeter();
                }
                audioMeter.connect(document);
                audioMeter.enable();
                if (!audioMeterRaf) {
                    const loop = () => {
                        if (audioMeter) {
                            const levels = audioMeter.getLevels();
                            window.parent.postMessage({ type: 'HELIOS_AUDIO_LEVELS', levels }, '*');
                        }
                        audioMeterRaf = requestAnimationFrame(loop);
                    };
                    audioMeterRaf = requestAnimationFrame(loop);
                }
                break;
            case 'HELIOS_STOP_METERING':
                if (audioMeterRaf) {
                    cancelAnimationFrame(audioMeterRaf);
                    audioMeterRaf = null;
                }
                if (audioMeter) {
                    audioMeter.disable();
                }
                break;
            case 'HELIOS_DIAGNOSE':
                const report = await Helios.diagnose();
                window.parent.postMessage({ type: 'HELIOS_DIAGNOSE_RESULT', report }, '*');
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
    // 4. Capture Global Errors
    window.addEventListener('error', (e) => {
        window.parent.postMessage({
            type: 'HELIOS_ERROR',
            error: {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                stack: e.error?.stack
            }
        }, '*');
    });
    window.addEventListener('unhandledrejection', (e) => {
        window.parent.postMessage({
            type: 'HELIOS_ERROR',
            error: {
                message: e.reason?.message || String(e.reason),
                stack: e.reason?.stack
            }
        }, '*');
    });
}
async function handleCaptureFrame(helios, data) {
    const { frame, selector, mode, width, height } = data;
    // 1. Seek
    helios.seek(frame);
    // 2. Wait for render (double RAF to be safe and ensure paint)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const state = helios.getState();
    const captions = state.activeCaptions || [];
    // 3. DOM Mode
    if (mode === 'dom') {
        try {
            const bitmap = await captureDomToBitmap(document.body, { targetWidth: width, targetHeight: height });
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
