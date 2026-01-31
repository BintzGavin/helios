import { BridgeController } from '@helios-project/player/controllers';
import { ClientSideExporter } from '@helios-project/player/features/exporter';

const iframe = document.getElementById('composition-frame') as HTMLIFrameElement;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
const progressFill = document.querySelector('.progress-fill') as HTMLDivElement;
const progressText = document.getElementById('progress-text') as HTMLSpanElement;

// Helper to check if controller is ready
// We use BridgeController to communicate with the iframe's Helios instance via postMessage
let controller: BridgeController | null = null;
let exporter: ClientSideExporter | null = null;

// Listen for HELIOS_READY to initialize controller
window.addEventListener('message', (event) => {
    if (event.data.type === 'HELIOS_READY') {
        console.log('Helios Ready detected');
        if (!controller && iframe.contentWindow) {
            controller = new BridgeController(iframe.contentWindow, event.data.state);
            exporter = new ClientSideExporter(controller, iframe);
            console.log('Controller and Exporter initialized');
        }
    }
});

// Also try to connect explicitly when iframe loads
iframe.addEventListener('load', () => {
    // Give it a moment to initialize
    setTimeout(() => {
        if (iframe.contentWindow) {
             iframe.contentWindow.postMessage({ type: 'HELIOS_CONNECT' }, '*');
        }
    }, 500);
});


exportBtn.addEventListener('click', async () => {
    if (!controller || !exporter) {
        // Try to connect one more time
        if (iframe.contentWindow) {
             iframe.contentWindow.postMessage({ type: 'HELIOS_CONNECT' }, '*');
        }
        alert('Helios not ready yet. Please wait or reload.');
        return;
    }

    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';
    progressFill.style.width = '0%';
    progressText.textContent = '0%';

    const abortController = new AbortController();

    try {
        await exporter.export({
            format: 'mp4',
            mode: 'canvas', // Explicitly use canvas mode for this example
            canvasSelector: '#canvas', // Should match ID in composition.html
            includeCaptions: true,
            signal: abortController.signal,
            onProgress: (progress: number) => {
                const percent = Math.round(progress * 100);
                progressFill.style.width = `${percent}%`;
                progressText.textContent = `${percent}%`;
            }
        });

        exportBtn.textContent = 'Export MP4';
        progressText.textContent = 'Done!';
    } catch (err: any) {
        console.error(err);
        alert(`Export failed: ${err.message}`);
        exportBtn.textContent = 'Export Failed';
    } finally {
        exportBtn.disabled = false;
    }
});
