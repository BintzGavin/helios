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
  </style>
  <iframe part="iframe"></iframe>
  <div class="controls">
    <button class="play-pause-btn" part="play-pause-button">▶</button>
    <button class="export-btn" part="export-button">Export</button>
    <input type="range" class="scrubber" min="0" value="0" step="1" part="scrubber">
    <div class="time-display" part="time-display">0.00 / 0.00</div>
  </div>
`;
export class HeliosPlayer extends HTMLElement {
    iframe;
    playPauseBtn;
    scrubber;
    timeDisplay;
    exportBtn;
    // The Helios instance driving the animation.
    // This can be a local instance (fallback) or a remote instance (from iframe).
    helios = null;
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this.iframe = this.shadowRoot.querySelector("iframe");
        this.playPauseBtn = this.shadowRoot.querySelector(".play-pause-btn");
        this.scrubber = this.shadowRoot.querySelector(".scrubber");
        this.timeDisplay = this.shadowRoot.querySelector(".time-display");
        this.exportBtn = this.shadowRoot.querySelector(".export-btn");
    }
    connectedCallback() {
        this.iframe.addEventListener("load", this.handleIframeLoad);
        // Set src from attribute
        const src = this.getAttribute("src");
        if (src) {
            this.iframe.src = src;
        }
        this.playPauseBtn.addEventListener("click", this.togglePlayPause);
        this.scrubber.addEventListener("input", this.handleScrubberInput);
        this.exportBtn.addEventListener("click", this.renderClientSide);
    }
    disconnectedCallback() {
        this.iframe.removeEventListener("load", this.handleIframeLoad);
        this.playPauseBtn.removeEventListener("click", this.togglePlayPause);
        this.scrubber.removeEventListener("input", this.handleScrubberInput);
        this.exportBtn.removeEventListener("click", this.renderClientSide);
        this.helios?.pause();
    }
    handleIframeLoad = () => {
        if (!this.iframe.contentWindow)
            return;
        // Check for Helios instance in the iframe
        const remoteHelios = this.iframe.contentWindow.helios;
        if (remoteHelios) {
            console.log("HeliosPlayer: Connected to remote Helios instance in iframe.");
            this.helios = remoteHelios;
        }
        else {
            console.warn("HeliosPlayer: No Helios instance found in iframe (window.helios). Player controls will not function.");
            // We could create a local instance, but it wouldn't drive anything.
            // For backwards compatibility or fallback, we might want to keep the old logic?
            // But the old logic relied on 'setAnimationTiming' which is also non-standard.
            // Let's assume strict adherence to the new protocol.
            return;
        }
        const state = this.helios.getState();
        this.scrubber.max = String(state.duration * state.fps);
        this.updateUI(state); // Initial UI update
        this.setupHeliosSubscription();
    };
    togglePlayPause = () => {
        if (!this.helios)
            return;
        const state = this.helios.getState();
        const isFinished = state.currentFrame >= state.duration * state.fps - 1;
        if (isFinished) {
            // Restart the animation
            this.helios.seek(0);
            this.helios.play();
        }
        else if (state.isPlaying) {
            this.helios.pause();
        }
        else {
            this.helios.play();
        }
    };
    handleScrubberInput = () => {
        const frame = parseInt(this.scrubber.value, 10);
        if (this.helios) {
            this.helios.seek(frame);
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
    setupHeliosSubscription() {
        if (!this.helios)
            return;
        this.helios.subscribe((state) => {
            // Since we are driving the remote instance, the iframe content should update itself
            // (because it should be subscribed to its own helios instance).
            // So we only need to update our UI.
            this.updateUI(state);
        });
    }
    renderClientSide = async () => {
        if (!this.helios)
            return;
        console.log("Client-side rendering started!");
        this.exportBtn.disabled = true;
        this.exportBtn.textContent = "Rendering...";
        // Pause playback before rendering
        this.helios.pause();
        let encoder = null;
        try {
            const state = this.helios.getState();
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
                this.helios.seek(i);
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
        let encoder = null;
        try {
            const state = this.helios.getState();
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
                this.helios.seek(i);
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
        // This is a basic implementation - for production, you'd want to use html2canvas or similar
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
