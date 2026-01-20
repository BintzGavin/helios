import { Helios } from "@helios-project/core";
import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { ExportStrategy } from "./ExportStrategy";

export class CanvasExportStrategy implements ExportStrategy {
  async export(
    helios: Helios,
    iframe: HTMLIFrameElement,
    onProgress: (progress: number) => void
  ): Promise<void> {
    console.log("Canvas export strategy started");
    let encoder: VideoEncoder | null = null;

    try {
      const state = helios.getState();
      const totalFrames = state.duration * state.fps;
      const canvas = iframe.contentWindow?.document.querySelector("canvas");

      if (!canvas) {
        throw new Error("No canvas found in the iframe");
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
          if (meta) {
            muxer.addVideoChunk(chunk, meta);
          }
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
        helios.seek(i);
        await new Promise((r) =>
          iframe.contentWindow?.requestAnimationFrame(r)
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
      const buffer = target.buffer;

      const blob = new Blob([buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "video.mp4";
      a.click();
      URL.revokeObjectURL(url);

      console.log("Canvas export finished!");
    } catch (e: any) {
      console.error("Canvas export failed:", e);
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
}
