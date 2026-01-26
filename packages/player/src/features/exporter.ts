import { HeliosController } from "../controllers";
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from "mp4-muxer";
import { Muxer as WebMMuxer, ArrayBufferTarget as WebMArrayBufferTarget } from "webm-muxer";
import { mixAudio } from "./audio-utils";

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
    format?: 'mp4' | 'webm';
  }): Promise<void> {
    const { onProgress, signal, mode = 'auto', canvasSelector = 'canvas', format = 'mp4' } = options;

    console.log(`Client-side rendering started! Format: ${format}`);
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
      let muxer: any;
      let target: any;

      if (format === 'webm') {
        target = new WebMArrayBufferTarget();
        muxer = new WebMMuxer({
          target,
          video: {
            codec: 'V_VP9',
            width,
            height,
            frameRate: state.fps
          },
          audio: {
            codec: 'A_OPUS',
            numberOfChannels: 2,
            sampleRate: 48000
          }
        });
      } else {
        target = new Mp4ArrayBufferTarget();
        muxer = new Mp4Muxer({
          target,
          video: {
              codec: 'avc',
              width: width,
              height: height
          },
          audio: {
              codec: 'aac',
              numberOfChannels: 2,
              sampleRate: 48000
          },
          firstTimestampBehavior: 'offset'
        });
      }

      encoder = new VideoEncoder({
        output: (chunk, meta) => {
          muxer.addVideoChunk(chunk, meta);
        },
        error: (e) => {
          console.error("VideoEncoder error:", e);
          throw e;
        },
      });

      // --- Audio Setup ---
      let audioEncoder: AudioEncoder | null = null;
      try {
          if (typeof AudioEncoder !== 'undefined') {
              audioEncoder = new AudioEncoder({
                  output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                  error: e => console.warn("AudioEncoder error:", e)
              });

              const audioConfig: AudioEncoderConfig = format === 'webm'
                ? {
                    codec: 'opus',
                    numberOfChannels: 2,
                    sampleRate: 48000
                  }
                : {
                    codec: 'mp4a.40.2',
                    numberOfChannels: 2,
                    sampleRate: 48000
                  };

              await audioEncoder.configure(audioConfig);

              const audioTracks = await this.controller.getAudioTracks();
              if (audioTracks && audioTracks.length > 0) {
                  const audioBuffer = await mixAudio(audioTracks, state.duration, 48000);
                  const c0 = audioBuffer.getChannelData(0);
                  const c1 = audioBuffer.getChannelData(1);
                  const planarData = new Float32Array(c0.length + c1.length);
                  planarData.set(c0, 0);
                  planarData.set(c1, c0.length);

                  const audioData = new AudioData({
                      format: 'f32-planar',
                      sampleRate: 48000,
                      numberOfFrames: audioBuffer.length,
                      numberOfChannels: 2,
                      timestamp: 0,
                      data: planarData
                  });

                  audioEncoder.encode(audioData);
                  audioData.close();
                  await audioEncoder.flush();
                  audioEncoder.close();
              }
          }
      } catch (e) {
          console.warn("Audio export failed or ignored:", e);
          if (audioEncoder) {
              try { audioEncoder.close(); } catch (_) {}
          }
      }

      let config: VideoEncoderConfig;

      if (format === 'webm') {
        config = {
          codec: 'vp09.00.10.08', // VP9 Profile 0, Level 4.1, 8-bit
          width,
          height,
          framerate: state.fps,
          bitrate: 5_000_000
        };
      } else {
        config = {
          codec: "avc1.420028", // H.264 Baseline Level 4.0
          width: width,
          height: height,
          framerate: state.fps,
          bitrate: 5_000_000, // 5 Mbps
        };
      }

      if (!(await VideoEncoder.isConfigSupported(config))) {
         if (format === 'mp4') {
             // Try a lower profile if 4.0 fails (rare but possible)
             config.codec = "avc1.42001E"; // Baseline Level 3.0
             if (!(await VideoEncoder.isConfigSupported(config))) {
                 firstFrame.close();
                 throw new Error(`Unsupported VideoEncoder config: ${JSON.stringify(config)}`);
             }
         } else {
             // For WebM (VP9), maybe try generic vp9 if specific profile fails, or just fail
             // Usually vp09.00.10.08 is widely supported where VP9 is supported.
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

      this.download(target.buffer, format);
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
          console.warn("Error closing video encoder:", e);
        }
      }
    }
  }

  private download(buffer: ArrayBuffer, format: 'mp4' | 'webm') {
      const type = format === 'webm' ? "video/webm" : "video/mp4";
      const blob = new Blob([buffer], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video.${format}`;
      a.click();
      URL.revokeObjectURL(url);
  }
}
