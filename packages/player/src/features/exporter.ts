import { HeliosController } from "../controllers";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";

export class ClientSideExporter {
  constructor(
    private controller: HeliosController,
    private iframe: HTMLIFrameElement // Kept for compatibility, though mostly unused now
  ) {}

  public async export(options: {
    onProgress: (progress: number) => void;
    signal: AbortSignal;
    mode?: 'auto' | 'canvas' | 'dom';
    canvasSelector?: string;
  }): Promise<void> {
    const { onProgress, signal, mode = 'auto', canvasSelector = 'canvas' } = options;

    console.log("Client-side rendering started!");
    this.controller.pause();

    let encoder: VideoEncoder | null = null;

    try {
      const state = this.controller.getState();
      const totalFrames = state.duration * state.fps;

      // 1. Determine effective mode
      let effectiveMode = mode;

      // If auto, try to find a canvas first. If not found, assume DOM.
      if (effectiveMode === 'auto') {
          // Try to capture frame 0 in canvas mode
          const testFrame = await this.controller.captureFrame(0, {
              selector: canvasSelector,
              mode: 'canvas'
          });

          if (testFrame) {
              effectiveMode = 'canvas';
              testFrame.close();
          } else {
              effectiveMode = 'dom';
              console.log("Canvas not found for auto export, falling back to DOM mode.");
          }
      }

      // 2. Capture first frame to determine dimensions and validate
      const firstFrame = await this.controller.captureFrame(0, {
          selector: canvasSelector,
          mode: effectiveMode as 'canvas' | 'dom'
      });

      if (!firstFrame) {
         throw new Error(`Failed to capture first frame in mode: ${effectiveMode}`);
      }

      const width = firstFrame.displayWidth;
      const height = firstFrame.displayHeight;

      // 3. Setup Muxer and Encoder
      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: {
            codec: 'avc',
            width: width,
            height: height
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
        codec: "avc1.420028", // H.264 Baseline Level 4.0
        width: width,
        height: height,
        framerate: state.fps,
        bitrate: 5_000_000, // 5 Mbps
      };

      if (!(await VideoEncoder.isConfigSupported(config))) {
         // Try a lower profile if 4.0 fails (rare but possible)
         config.codec = "avc1.42001E"; // Baseline Level 3.0
         if (!(await VideoEncoder.isConfigSupported(config))) {
             firstFrame.close();
             throw new Error(`Unsupported VideoEncoder config: ${JSON.stringify(config)}`);
         }
      }

      await encoder.configure(config);

      // Encode first frame
      await encoder.encode(firstFrame, { keyFrame: true });
      firstFrame.close();
      onProgress(1 / totalFrames);

      // 4. Render Loop
      for (let i = 1; i < totalFrames; i++) {
        if (signal.aborted) {
            throw new Error("Export aborted");
        }

        const frame = await this.controller.captureFrame(i, {
            selector: canvasSelector,
            mode: effectiveMode as 'canvas' | 'dom'
        });

        if (!frame) {
            throw new Error(`Frame ${i} missing during export.`);
        }

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
          return;
      }
      console.error("Client-side rendering failed:", e);
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
}
