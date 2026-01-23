import { Muxer, ArrayBufferTarget } from "mp4-muxer";
const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      background-color: #f0f0f0;
      position: relative;
      font-family: sans-serif;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      padding: 8px;
      color: white;
    }
    .play-pause-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      width: 40px;
      height: 40px;
    }
    .export-btn {
      background-color: #007bff;
      border: none;
      color: white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      padding: 6px 12px;
      margin: 0 10px;
      border-radius: 4px;
    }
    .export-btn:hover {
      background-color: #0056b3;
    }
    .export-btn:disabled {
      background-color: #666;
      cursor: not-allowed;
    }
    .scrubber {
      flex-grow: 1;
      margin: 0 16px;
      -webkit-appearance: none;
      width: 100%;
      height: 8px;
      background: #555;
      outline: none;
      opacity: 0.9;
      transition: opacity .2s;
    }
    .scrubber::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      background: #007bff;
      cursor: pointer;
      border-radius: 50%;
    }
    .time-display {
      min-width: 90px;
      text-align: center;
    }
    .status-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: opacity 0.3s;
    }
    .status-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .error-msg {
      color: #ff6b6b;
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: bold;
    }
    .retry-btn {
      background-color: #ff6b6b;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    }
    .retry-btn:hover {
      background-color: #ff5252;
    }
  </style>
  <div class="status-overlay" part="overlay">
    <div class="status-text">Connecting...</div>
    <button class="retry-btn" style="display:none">Retry</button>
  </div>
  <iframe part="iframe" sandbox="allow-scripts allow-same-origin"></iframe>
  <div class="controls">
    <button class="play-pause-btn" part="play-pause-button">▶</button>
    <button class="export-btn" part="export-button">Export</button>
    <input type="range" class="scrubber" min="0" value="0" step="1" part="scrubber">
    <div class="time-display" part="time-display">0.00 / 0.00</div>
  </div>
`;
class DirectController {
    instance;
    constructor(instance) {
        this.instance = instance;
    }
    play() { this.instance.play(); }
    pause() { this.instance.pause(); }
    seek(frame) { this.instance.seek(frame); }
    subscribe(callback) { return this.instance.subscribe(callback); }
    getState() { return this.instance.getState(); }
    dispose() { }
}
class BridgeController {
    iframeWindow;
    listeners = [];
    lastState;
    constructor(iframeWindow, initialState) {
        this.iframeWindow = iframeWindow;
        this.lastState = initialState || { isPlaying: false, currentFrame: 0, duration: 0, fps: 30 };
        window.addEventListener('message', this.handleMessage);
    }
    handleMessage = (event) => {
        // Only accept messages from valid sources?
        // For now we accept any HELIOS_STATE as we might not know the exact source origin if sandboxed 'null'
        if (event.data?.type === 'HELIOS_STATE') {
            this.lastState = event.data.state;
            this.notifyListeners();
        }
    };
    notifyListeners() {
        this.listeners.forEach(cb => cb(this.lastState));
    }
    play() { this.iframeWindow.postMessage({ type: 'HELIOS_PLAY' }, '*'); }
    pause() { this.iframeWindow.postMessage({ type: 'HELIOS_PAUSE' }, '*'); }
    seek(frame) { this.iframeWindow.postMessage({ type: 'HELIOS_SEEK', frame }, '*'); }
    subscribe(callback) {
        this.listeners.push(callback);
        // Call immediately with current state
        callback(this.lastState);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }
    getState() { return this.lastState; }
    dispose() {
        window.removeEventListener('message', this.handleMessage);
    }
}
export class HeliosPlayer extends HTMLElement {
    iframe;
    playPauseBtn;
    scrubber;
    timeDisplay;
    exportBtn;
    overlay;
    statusText;
    retryBtn;
    controller = null;
    // Keep track if we have direct access for export purposes
    directHelios = null;
    unsubscribe = null;
    connectionTimeout = null;
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.iframe = this.shadowRoot.querySelector("iframe");
        this.playPauseBtn = this.shadowRoot.querySelector(".play-pause-btn");
        this.scrubber = this.shadowRoot.querySelector(".scrubber");
        this.timeDisplay = this.shadowRoot.querySelector(".time-display");
        this.exportBtn = this.shadowRoot.querySelector(".export-btn");
        this.overlay = this.shadowRoot.querySelector(".status-overlay");
        this.statusText = this.shadowRoot.querySelector(".status-text");
        this.retryBtn = this.shadowRoot.querySelector(".retry-btn");
        this.retryBtn.onclick = () => this.retryConnection();
    }
    connectedCallback() {
        this.iframe.addEventListener("load", this.handleIframeLoad);
        window.addEventListener("message", this.handleWindowMessage);
        // Set src from attribute
        const src = this.getAttribute("src");
        if (src) {
            this.iframe.src = src;
        }
        this.playPauseBtn.addEventListener("click", this.togglePlayPause);
        this.scrubber.addEventListener("input", this.handleScrubberInput);
        this.exportBtn.addEventListener("click", this.renderClientSide);
        // Initial state: disabled until connected
        this.setControlsDisabled(true);
        this.showStatus("Connecting...", false);
    }
    disconnectedCallback() {
        this.iframe.removeEventListener("load", this.handleIframeLoad);
        window.removeEventListener("message", this.handleWindowMessage);
        this.playPauseBtn.removeEventListener("click", this.togglePlayPause);
        this.scrubber.removeEventListener("input", this.handleScrubberInput);
        this.exportBtn.removeEventListener("click", this.renderClientSide);
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        if (this.controller) {
            this.controller.pause();
            this.controller.dispose();
        }
    }
    setControlsDisabled(disabled) {
        this.playPauseBtn.disabled = disabled;
        this.scrubber.disabled = disabled;
        // Export is managed separately based on direct access
        if (disabled) {
            this.exportBtn.disabled = true;
        }
    }
    handleIframeLoad = () => {
        if (!this.iframe.contentWindow)
            return;
        // Clear any existing timeout
        if (this.connectionTimeout)
            window.clearTimeout(this.connectionTimeout);
        // 1. Try Direct Mode (Legacy/Local)
        let directInstance;
        try {
            directInstance = this.iframe.contentWindow.helios;
        }
        catch (e) {
            // Access denied (Cross-origin)
            console.log("HeliosPlayer: Direct access to iframe denied (likely cross-origin).");
        }
        if (directInstance) {
            console.log("HeliosPlayer: Connected via Direct Mode.");
            this.hideStatus();
            this.directHelios = directInstance;
            this.setController(new DirectController(directInstance));
            this.exportBtn.disabled = false;
            return;
        }
        else {
            this.directHelios = null;
            this.exportBtn.disabled = true; // Cannot export without direct access currently
            // If not direct, we wait for Bridge connection
            console.log("HeliosPlayer: Waiting for Bridge connection...");
        }
        // Start timeout for bridge
        this.connectionTimeout = window.setTimeout(() => {
            this.showStatus("Connection Failed. Check window.helios.", true);
        }, 3000);
        // 2. Initiate Bridge Mode (always try to connect)
        this.iframe.contentWindow.postMessage({ type: 'HELIOS_CONNECT' }, '*');
    };
    handleWindowMessage = (event) => {
        // Check if this message is a handshake response
        if (event.data?.type === 'HELIOS_READY') {
            if (this.connectionTimeout)
                window.clearTimeout(this.connectionTimeout);
            this.hideStatus();
            // If we already have a controller (e.g. Direct Mode), we might stick with it
            // OR we could switch to Bridge if we prefer consistent behavior?
            // BUT Direct Mode is needed for Export.
            // So if we have directHelios, we ignore HELIOS_READY for control purposes,
            // or we just acknowledge it but don't replace the controller.
            if (!this.controller) {
                console.log("HeliosPlayer: Connected via Bridge Mode.");
                const iframeWin = this.iframe.contentWindow;
                if (iframeWin) {
                    this.setController(new BridgeController(iframeWin));
                    // Ensure we get the latest state immediately if provided
                    if (event.data.state) {
                        this.updateUI(event.data.state);
                    }
                }
            }
        }
    };
    setController(controller) {
        // Clean up old controller
        if (this.controller) {
            this.controller.dispose();
        }
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.controller = controller;
        this.setControlsDisabled(false);
        const state = this.controller.getState();
        if (state) {
            this.scrubber.max = String(state.duration * state.fps);
            this.updateUI(state);
        }
        this.unsubscribe = this.controller.subscribe((s) => this.updateUI(s));
    }
    togglePlayPause = () => {
        if (!this.controller)
            return;
        const state = this.controller.getState();
        const isFinished = state.currentFrame >= state.duration * state.fps - 1;
        if (isFinished) {
            // Restart the animation
            this.controller.seek(0);
            this.controller.play();
        }
        else if (state.isPlaying) {
            this.controller.pause();
        }
        else {
            this.controller.play();
        }
    };
    handleScrubberInput = () => {
        const frame = parseInt(this.scrubber.value, 10);
        if (this.controller) {
            this.controller.seek(frame);
        }
    };
    updateUI(state) {
        const isFinished = state.currentFrame >= state.duration * state.fps - 1;
        if (isFinished) {
            this.playPauseBtn.textContent = "🔄"; // Restart button
        }
        else {
            this.playPauseBtn.textContent = state.isPlaying ? "❚❚" : "▶";
        }
        this.scrubber.value = String(state.currentFrame);
        this.timeDisplay.textContent = `${(state.currentFrame / state.fps).toFixed(2)} / ${state.duration.toFixed(2)}`;
    }
    showStatus(msg, isError) {
        this.overlay.classList.remove("hidden");
        this.statusText.textContent = msg;
        this.retryBtn.style.display = isError ? "block" : "none";
    }
    hideStatus() {
        this.overlay.classList.add("hidden");
    }
    retryConnection() {
        this.showStatus("Retrying...", false);
        // Reload iframe to force fresh start
        const src = this.iframe.src;
        this.iframe.src = src;
    }
    renderClientSide = async () => {
        // Export requires Direct Mode
        if (!this.directHelios || !this.controller) {
            console.error("Export not available: No direct access to Helios instance.");
            return;
        }
        console.log("Client-side rendering started!");
        this.exportBtn.disabled = true;
        this.exportBtn.textContent = "Rendering...";
        // Pause playback before rendering
        this.controller.pause();
        let encoder = null;
        try {
            const state = this.controller.getState();
            const totalFrames = state.duration * state.fps;
            // Check if this is a canvas-based or DOM-based composition
            // We look for a canvas in the iframe
            const canvas = this.iframe.contentWindow?.document.querySelector("canvas");
            const isCanvasBased = !!canvas;
            if (!isCanvasBased) {
                // For DOM-based compositions, we'll convert DOM to canvas for export
                await this.renderDOMToVideo();
                return;
            }
            const target = new ArrayBufferTarget();
            const muxer = new Muxer({
                target,
            });
            encoder = new VideoEncoder({
                output: (chunk, meta) => {
                    if (meta) {
                        muxer.addVideoChunk(chunk, meta);
                    }
                },
                error: (e) => {
                    console.error("VideoEncoder error:", e);
                    throw e;
                },
            });
            const config = {
                codec: "avc1.42001E", // H.264 Baseline
                width: canvas.width,
                height: canvas.height,
                framerate: state.fps,
                bitrate: 5_000_000, // 5 Mbps
            };
            if (!(await VideoEncoder.isConfigSupported(config))) {
                throw new Error(`Unsupported VideoEncoder config: ${JSON.stringify(config)}`);
            }
            await encoder.configure(config);
            for (let i = 0; i < totalFrames; i++) {
                // Seek the remote Helios instance
                this.controller.seek(i);
                // Wait for a frame to pass to ensure rendering is updated
                // We use the iframe's requestAnimationFrame to be sure
                await new Promise((r) => this.iframe.contentWindow?.requestAnimationFrame(r));
                // Double check: wait one more frame? sometimes seeking takes a tick
                // But let's start with one.
                const frame = new VideoFrame(canvas, {
                    timestamp: (i / state.fps) * 1_000_000,
                });
                const keyFrame = i % (state.fps * 2) === 0;
                await encoder.encode(frame, { keyFrame });
                frame.close();
                this.exportBtn.textContent = `Rendering: ${Math.round(((i + 1) / totalFrames) * 100)}%`;
            }
            await encoder.flush();
            muxer.finalize();
            const buffer = target.buffer;
            const blob = new Blob([buffer], { type: "video/mp4" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "video.mp4";
            a.click();
            URL.revokeObjectURL(url);
            console.log("Client-side rendering and download finished!");
        }
        catch (e) {
            console.error("Client-side rendering failed:", e);
            alert(`Rendering failed: ${e.message}`);
        }
        finally {
            // Clean up encoder
            if (encoder) {
                try {
                    await encoder.close();
                }
                catch (e) {
                    console.warn("Error closing encoder:", e);
                }
            }
            this.exportBtn.disabled = false;
            this.exportBtn.textContent = "Export";
        }
    };
    async renderDOMToVideo() {
        if (!this.directHelios || !this.controller)
            return;
        let encoder = null;
        try {
            const state = this.controller.getState();
            const totalFrames = state.duration * state.fps;
            // Create a temporary canvas for DOM-to-canvas conversion
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            // Set canvas size to match iframe content
            const iframeDoc = this.iframe.contentDocument;
            const body = iframeDoc.body;
            tempCanvas.width = body.scrollWidth;
            tempCanvas.height = body.scrollHeight;
            // Create video encoder setup
            const target = new ArrayBufferTarget();
            const muxer = new Muxer({
                target,
            });
            encoder = new VideoEncoder({
                output: (chunk, meta) => {
                    if (meta) {
                        muxer.addVideoChunk(chunk, meta);
                    }
                },
                error: (e) => {
                    console.error("VideoEncoder error:", e);
                    throw e;
                },
            });
            const config = {
                codec: "avc1.42001E", // H.264 Baseline
                width: tempCanvas.width,
                height: tempCanvas.height,
                framerate: state.fps,
                bitrate: 5_000_000, // 5 Mbps
            };
            if (!(await VideoEncoder.isConfigSupported(config))) {
                throw new Error(`Unsupported VideoEncoder config: ${JSON.stringify(config)}`);
            }
            await encoder.configure(config);
            // Render each frame
            for (let i = 0; i < totalFrames; i++) {
                // Seek to the current frame
                this.controller.seek(i);
                // Wait for the animation to update
                await new Promise((r) => this.iframe.contentWindow?.requestAnimationFrame(r));
                // Convert DOM to canvas using html2canvas-like approach
                await this.captureDOMToCanvas(tempCanvas, tempCtx);
                // Create video frame from canvas
                const frame = new VideoFrame(tempCanvas, {
                    timestamp: (i / state.fps) * 1_000_000,
                });
                const keyFrame = i % (state.fps * 2) === 0;
                await encoder.encode(frame, { keyFrame });
                frame.close();
                this.exportBtn.textContent = `Rendering: ${Math.round(((i + 1) / totalFrames) * 100)}%`;
            }
            await encoder.flush();
            muxer.finalize();
            const buffer = target.buffer;
            const blob = new Blob([buffer], { type: "video/mp4" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "video.mp4";
            a.click();
            URL.revokeObjectURL(url);
            console.log("DOM-to-video rendering finished!");
        }
        catch (e) {
            console.error("DOM-to-video rendering failed:", e);
            alert(`Rendering failed: ${e.message}`);
        }
        finally {
            // Clean up encoder
            if (encoder) {
                try {
                    await encoder.close();
                }
                catch (e) {
                    console.warn("Error closing encoder:", e);
                }
            }
        }
    }
    async captureDOMToCanvas(canvas, ctx) {
        // This requires access to iframe.contentDocument, only available in Direct Mode
        const iframeDoc = this.iframe.contentDocument;
        const body = iframeDoc.body;
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Set background color
        const computedStyle = iframeDoc.defaultView?.getComputedStyle(body);
        const bgColor = computedStyle?.backgroundColor || "#eee";
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Simple DOM-to-canvas conversion
        await this.renderElementToCanvas(body, ctx, 0, 0);
    }
    async renderElementToCanvas(element, ctx, offsetX, offsetY) {
        const iframeWindow = this.iframe.contentWindow;
        const computedStyle = iframeWindow.getComputedStyle(element);
        // Get element bounds
        const rect = element.getBoundingClientRect();
        const x = rect.left + offsetX;
        const y = rect.top + offsetY;
        const width = rect.width;
        const height = rect.height;
        // Skip if element is not visible
        if (computedStyle.display === "none" ||
            computedStyle.visibility === "hidden" ||
            width === 0 ||
            height === 0) {
            return;
        }
        // Handle different element types
        if (element instanceof HTMLDivElement) {
            // Render div background and border
            const bgColor = computedStyle.backgroundColor;
            if (bgColor &&
                bgColor !== "rgba(0, 0, 0, 0)" &&
                bgColor !== "transparent") {
                ctx.fillStyle = bgColor;
                ctx.fillRect(x, y, width, height);
            }
            // Render border if present
            const borderWidth = parseInt(computedStyle.borderWidth);
            if (borderWidth > 0) {
                ctx.strokeStyle = computedStyle.borderColor;
                ctx.lineWidth = borderWidth;
                ctx.strokeRect(x, y, width, height);
            }
        }
        // Recursively render child elements
        for (const child of Array.from(element.children)) {
            await this.renderElementToCanvas(child, ctx, offsetX, offsetY);
        }
    }
}
customElements.define("helios-player", HeliosPlayer);
