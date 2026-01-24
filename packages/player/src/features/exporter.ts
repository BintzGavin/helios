import { HeliosController } from "../controllers";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

export class ClientSideExporter {
  constructor(
    private controller: HeliosController,
    private iframe: HTMLIFrameElement
  ) {}

  public async export(options: {
    onProgress: (progress: number) => void;
    signal: AbortSignal;
  }): Promise<void> {
    const { onProgress, signal } = options;

    console.log("Client-side rendering started!");
    this.controller.pause();

    let encoder: VideoEncoder | null = null;

    try {
      const state = this.controller.getState();
      const totalFrames = state.duration * state.fps;

      // Check if this is a canvas-based or DOM-based composition
      const canvas =
        this.iframe.contentWindow?.document.querySelector("canvas");
      const isCanvasBased = !!canvas;

      if (!isCanvasBased) {
        await this.exportDOM(state, totalFrames, onProgress, signal);
        return;
      }

      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: {
            codec: 'avc',
            width: canvas.width,
            height: canvas.height
        }
      });

      encoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
        },
        error: (e) => {
          console.error("VideoEncoder error:", e);
          throw e;
        },
      });

      const config: VideoEncoderConfig = {
        codec: "avc1.42001E", // H.264 Baseline
        width: canvas.width,
        height: canvas.height,
        framerate: state.fps,
        bitrate: 5_000_000, // 5 Mbps
      };

      if (!(await VideoEncoder.isConfigSupported(config))) {
        throw new Error(
          `Unsupported VideoEncoder config: ${JSON.stringify(config)}`
        );
      }

      await encoder.configure(config);

      for (let i = 0; i < totalFrames; i++) {
        if (signal.aborted) {
            throw new Error("Export aborted");
        }

        // Seek the remote Helios instance
        this.controller.seek(i);

        // Wait for a frame to pass to ensure rendering is updated
        // We use the iframe's requestAnimationFrame to be sure
        await new Promise((r) =>
          this.iframe.contentWindow?.requestAnimationFrame(r)
        );

        const frame = new VideoFrame(canvas, {
          timestamp: (i / state.fps) * 1_000_000,
        });
        const keyFrame = i % (state.fps * 2) === 0;

        await encoder.encode(frame, { keyFrame });
        frame.close();

        onProgress((i + 1) / totalFrames);
      }

      await encoder.flush();
      muxer.finalize();

      this.download(target.buffer);
      console.log("Client-side rendering and download finished!");

    } catch (e: any) {
      if (e.message === "Export aborted") {
          console.log("Export aborted by user.");
          return; // Suppress error
      }
      console.error("Client-side rendering failed:", e);
      throw e;
    } finally {
      // Clean up encoder
      if (encoder) {
        try {
          await encoder.close();
        } catch (e) {
          console.warn("Error closing encoder:", e);
        }
      }
    }
  }

  private async exportDOM(
    state: any,
    totalFrames: number,
    onProgress: (p: number) => void,
    signal: AbortSignal
  ) {
    let encoder: VideoEncoder | null = null;

    try {
      // Create a temporary canvas for DOM-to-canvas conversion
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d")!;

      // Set canvas size to match iframe content
      const iframeDoc = this.iframe.contentDocument!;
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
          muxer.addVideoChunk(chunk, meta);
        },
        error: (e) => {
          console.error("VideoEncoder error:", e);
          throw e;
        },
      });

      const config: VideoEncoderConfig = {
        codec: "avc1.42001E", // H.264 Baseline
        width: tempCanvas.width,
        height: tempCanvas.height,
        framerate: state.fps,
        bitrate: 5_000_000, // 5 Mbps
      };

      if (!(await VideoEncoder.isConfigSupported(config))) {
        throw new Error(
          `Unsupported VideoEncoder config: ${JSON.stringify(config)}`
        );
      }

      await encoder.configure(config);

      // Render each frame
      for (let i = 0; i < totalFrames; i++) {
        if (signal.aborted) {
            throw new Error("Export aborted");
        }

        // Seek to the current frame
        this.controller.seek(i);

        // Wait for the animation to update
        await new Promise((r) =>
          this.iframe.contentWindow?.requestAnimationFrame(r)
        );

        // Convert DOM to canvas
        await this.captureDOMToCanvas(tempCanvas, tempCtx);

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

      this.download(target.buffer);
      console.log("DOM-to-video rendering finished!");

    } catch (e: any) {
        if (e.message === "Export aborted") {
            console.log("Export aborted by user.");
            return;
        }
        console.error("DOM-to-video rendering failed:", e);
        throw e;
    } finally {
      if (encoder) {
        try {
          await encoder.close();
        } catch (e) {
          console.warn("Error closing encoder:", e);
        }
      }
    }
  }

  private download(buffer: ArrayBuffer) {
      const blob = new Blob([buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "video.mp4";
      a.click();
      URL.revokeObjectURL(url);
  }

  private async captureDOMToCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) {
    const iframeDoc = this.iframe.contentDocument!;
    const body = iframeDoc.body;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const computedStyle = iframeDoc.defaultView?.getComputedStyle(body);
    const bgColor = computedStyle?.backgroundColor || "#eee";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await this.renderElementToCanvas(body, ctx, 0, 0);
  }

  private async renderElementToCanvas(
    element: Element,
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number
  ) {
    const iframeWindow = this.iframe.contentWindow!;
    const computedStyle = iframeWindow.getComputedStyle(element);

    const rect = element.getBoundingClientRect();
    const x = rect.left + offsetX;
    const y = rect.top + offsetY;
    const width = rect.width;
    const height = rect.height;

    if (
      computedStyle.display === "none" ||
      computedStyle.visibility === "hidden" ||
      width === 0 ||
      height === 0
    ) {
      return;
    }

    if (element instanceof HTMLDivElement) {
      const bgColor = computedStyle.backgroundColor;
      if (
        bgColor &&
        bgColor !== "rgba(0, 0, 0, 0)" &&
        bgColor !== "transparent"
      ) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(x, y, width, height);
      }

      const borderWidth = parseInt(computedStyle.borderWidth);
      if (borderWidth > 0) {
        ctx.strokeStyle = computedStyle.borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(x, y, width, height);
      }
    }

    for (const child of Array.from(element.children)) {
      await this.renderElementToCanvas(child, ctx, offsetX, offsetY);
    }
  }
}
