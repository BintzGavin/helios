import { Muxer, ArrayBufferTarget } from "mp4-muxer";
export class DomExportStrategy {
    async export(helios, iframe, onProgress) {
        console.log("DOM export strategy started");
        let encoder = null;
        try {
            const state = helios.getState();
            const totalFrames = state.duration * state.fps;
            // Create a temporary canvas for DOM-to-canvas conversion
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            // Set canvas size to match iframe content
            const iframeDoc = iframe.contentDocument;
            const body = iframeDoc.body;
            tempCanvas.width = body.scrollWidth;
            tempCanvas.height = body.scrollHeight;
            // Create video encoder setup
            const target = new ArrayBufferTarget();
            const muxer = new Muxer({
                target,
                video: {
                    codec: 'avc',
                    width: tempCanvas.width,
                    height: tempCanvas.height
                }
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
                helios.seek(i);
                // Wait for the animation to update
                await new Promise((r) => iframe.contentWindow?.requestAnimationFrame(r));
                // Convert DOM to canvas using html2canvas-like approach
                await this.captureDOMToCanvas(iframe, tempCanvas, tempCtx);
                // Create video frame from canvas
                const frame = new VideoFrame(tempCanvas, {
                    timestamp: (i / state.fps) * 1_000_000,
                });
                const keyFrame = i % (state.fps * 2) === 0;
                await encoder.encode(frame, { keyFrame });
                frame.close();
                onProgress((i + 1) / totalFrames);
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
            console.log("DOM export finished!");
        }
        catch (e) {
            console.error("DOM export failed:", e);
            throw e;
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
    async captureDOMToCanvas(iframe, canvas, ctx) {
        const iframeDoc = iframe.contentDocument;
        const body = iframeDoc.body;
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Set background color
        const computedStyle = iframeDoc.defaultView?.getComputedStyle(body);
        const bgColor = computedStyle?.backgroundColor || "#eee";
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Simple DOM-to-canvas conversion
        await this.renderElementToCanvas(iframe, body, ctx, 0, 0);
    }
    async renderElementToCanvas(iframe, element, ctx, offsetX, offsetY) {
        const iframeWindow = iframe.contentWindow;
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
            await this.renderElementToCanvas(iframe, child, ctx, offsetX, offsetY);
        }
    }
}
