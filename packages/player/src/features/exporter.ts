import { HeliosController } from "../controllers";
import { CaptionCue } from "@helios-project/core";
import { stringifySRT, SubtitleCue } from "./caption-parser";
import {
  Output,
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  VideoSampleSource,
  AudioSampleSource,
  VideoSample,
  AudioSample,
  VideoEncodingConfig,
  AudioEncodingConfig
} from "mediabunny";
import { mixAudio } from "./audio-utils";

export class ClientSideExporter {
  constructor(
    private controller: HeliosController,
    private iframe: HTMLIFrameElement // Kept for compatibility
  ) {}

  public async export(options: {
    onProgress: (progress: number) => void;
    signal: AbortSignal;
    mode?: 'auto' | 'canvas' | 'dom';
    canvasSelector?: string;
    format?: 'mp4' | 'webm';
    includeCaptions?: boolean;
    width?: number;
    height?: number;
  }): Promise<void> {
    const { onProgress, signal, mode = 'auto', canvasSelector = 'canvas', format = 'mp4', includeCaptions = true, width: targetWidth, height: targetHeight } = options;

    console.log(`Client-side rendering started! Format: ${format}`);
    this.controller.pause();

    try {
      const state = this.controller.getState();

      let startFrame = 0;
      let totalFrames = state.duration * state.fps;

      if (state.playbackRange && state.playbackRange.length === 2) {
          startFrame = state.playbackRange[0];
          const endFrame = state.playbackRange[1];
          totalFrames = endFrame - startFrame;
      }

      // 1. Determine effective mode
      let effectiveMode = mode;

      if (effectiveMode === 'auto') {
          const result = await this.controller.captureFrame(startFrame, {
              selector: canvasSelector,
              mode: 'canvas',
              width: targetWidth,
              height: targetHeight
          });

          if (result && result.frame) {
              effectiveMode = 'canvas';
              result.frame.close();
          } else {
              effectiveMode = 'dom';
              console.log("Canvas not found for auto export, falling back to DOM mode.");
          }
      }

      // 2. Capture first frame to determine dimensions
      const firstResult = await this.controller.captureFrame(startFrame, {
          selector: canvasSelector,
          mode: effectiveMode as 'canvas' | 'dom',
          width: targetWidth,
          height: targetHeight
      });

      if (!firstResult || !firstResult.frame) {
         throw new Error(`Failed to capture first frame in mode: ${effectiveMode}`);
      }

      const { frame: firstFrame, captions: firstCaptions } = firstResult;
      const width = firstFrame.displayWidth;
      const height = firstFrame.displayHeight;

      // 3. Setup Mediabunny Output
      const target = new BufferTarget();
      const outputFormat = format === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat();
      const output = new Output({
          format: outputFormat,
          target
      });

      // 4. Setup Video Track
      const videoConfig: VideoEncodingConfig = {
          codec: format === 'webm' ? 'vp9' : 'avc',
          bitrate: 5_000_000,
          width,
          height
      };

      const videoSource = new VideoSampleSource(videoConfig);
      output.addVideoTrack(videoSource);

      // 5. Setup Audio Track
      let audioSource: AudioSampleSource | null = null;
      let audioTracks: any[] = [];

      try {
          audioTracks = await this.controller.getAudioTracks();
          if (audioTracks && audioTracks.length > 0) {
              const audioConfig: AudioEncodingConfig = format === 'webm'
                  ? { codec: 'opus' }
                  : { codec: 'aac' };

              audioSource = new AudioSampleSource(audioConfig);
              output.addAudioTrack(audioSource);
          }
      } catch (e) {
          console.warn("Failed to setup audio:", e);
      }

      await output.start();

      // 6. Encode Loop
      // Encode first frame
      let frameToEncode = firstFrame;
      if (includeCaptions && firstCaptions && firstCaptions.length > 0) {
          frameToEncode = await this.drawCaptions(firstFrame, firstCaptions);
          firstFrame.close();
      }

      await videoSource.add(new VideoSample(frameToEncode), { keyFrame: true });
      frameToEncode.close();

      onProgress(1 / totalFrames);

      for (let i = 1; i < totalFrames; i++) {
        if (signal.aborted) {
            throw new Error("Export aborted");
        }

        const frameIndex = startFrame + i;
        const result = await this.controller.captureFrame(frameIndex, {
            selector: canvasSelector,
            mode: effectiveMode as 'canvas' | 'dom',
            width: targetWidth,
            height: targetHeight
        });

        if (!result || !result.frame) {
            throw new Error(`Frame ${frameIndex} missing during export.`);
        }

        const { frame: videoFrame, captions } = result;
        const keyFrame = i % (state.fps * 2) === 0;

        let finalFrame = videoFrame;
        if (includeCaptions && captions && captions.length > 0) {
             finalFrame = await this.drawCaptions(videoFrame, captions);
             videoFrame.close();
        }

        await videoSource.add(new VideoSample(finalFrame), { keyFrame });
        finalFrame.close();

        onProgress((i + 1) / totalFrames);
      }

      // 7. Process Audio
      if (audioSource && audioTracks.length > 0) {
          const durationInSeconds = totalFrames / state.fps;
          const rangeStartInSeconds = startFrame / state.fps;
          const audioBuffer = await mixAudio(audioTracks, durationInSeconds, 48000, rangeStartInSeconds);

          const c0 = audioBuffer.getChannelData(0);
          const c1 = audioBuffer.getChannelData(1);

          const planarData = new Float32Array(c0.length + c1.length);
          planarData.set(c0, 0);
          planarData.set(c1, c0.length);

          const sample = new AudioSample({
              format: 'f32-planar',
              sampleRate: 48000,
              numberOfChannels: 2,
              timestamp: 0,
              data: planarData
          });

          await audioSource.add(sample);
      }

      await output.finalize();

      if (target.buffer) {
        this.download(target.buffer, format);
        console.log("Client-side rendering and download finished!");
      } else {
        throw new Error("Export failed: Output buffer is empty");
      }

    } catch (e: any) {
      if (e.message === "Export aborted") {
          console.log("Export aborted by user.");
          return;
      }
      console.error("Client-side rendering failed:", e);
      throw e;
    }
  }

  private async drawCaptions(frame: VideoFrame, captions: CaptionCue[]): Promise<VideoFrame> {
      const width = frame.displayWidth;
      const height = frame.displayHeight;
      let canvas: OffscreenCanvas | HTMLCanvasElement;
      let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

      if (typeof OffscreenCanvas !== 'undefined') {
          canvas = new OffscreenCanvas(width, height);
          ctx = canvas.getContext('2d');
      } else {
          canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          ctx = canvas.getContext('2d');
      }

      if (!ctx) throw new Error("Failed to create canvas context for captions");

      ctx.drawImage(frame, 0, 0);

      ctx.save();

      const fontSize = Math.max(16, Math.round(height * 0.05));
      const padding = fontSize * 0.5;
      const lineHeight = fontSize * 1.2;
      const bottomMargin = height * 0.05;

      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      let currentBottomY = height - bottomMargin;
      const reversedCaptions = [...captions].reverse();

      reversedCaptions.forEach(cue => {
          const lines = cue.text.split('\n');
          const cueHeight = lines.length * lineHeight + (padding * 2);

          let maxLineWidth = 0;
          lines.forEach((line: any) => {
             const m = ctx!.measureText(line);
             if (m.width > maxLineWidth) maxLineWidth = m.width;
          });

          const bgWidth = maxLineWidth + (fontSize * 1.0);
          const bgTopY = currentBottomY - cueHeight;

          ctx!.shadowColor = 'transparent';
          ctx!.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx!.fillRect((width / 2) - (bgWidth / 2), bgTopY, bgWidth, cueHeight);

          ctx!.shadowColor = 'black';
          ctx!.shadowBlur = 2;
          ctx!.shadowOffsetY = 1;
          ctx!.fillStyle = 'white';
          lines.forEach((line: any, i: any) => {
              const y = bgTopY + padding + (i * lineHeight);
              ctx!.fillText(line, width / 2, y);
          });

          currentBottomY -= (cueHeight + 4);
      });

      ctx.restore();

      return new VideoFrame(canvas, { timestamp: frame.timestamp });
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

  public saveCaptionsAsSRT(cues: SubtitleCue[], filename: string) {
    const srtContent = stringifySRT(cues);
    const blob = new Blob([srtContent], { type: "text/srt" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
