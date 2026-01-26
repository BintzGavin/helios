import { RendererOptions } from '../types';

export class FFmpegBuilder {
  static getArgs(options: RendererOptions, outputPath: string, videoInputArgs: string[]): string[] {
    const audioInputs: string[] = [];

    // Prioritize audioTracks if present, otherwise use audioFilePath
    if (options.audioTracks && options.audioTracks.length > 0) {
      audioInputs.push(...options.audioTracks);
    } else if (options.audioFilePath) {
      audioInputs.push(options.audioFilePath);
    }

    let audioInputArgs: string[] = [];

    // Add audio inputs with seek time if needed
    for (const audioPath of audioInputs) {
      if (options.startFrame && options.startFrame > 0) {
        const startTime = options.startFrame / options.fps;
        audioInputArgs.push('-ss', startTime.toString(), '-i', audioPath);
      } else {
        audioInputArgs.push('-i', audioPath);
      }
    }

    let audioOutputArgs: string[] = [];
    if (audioInputs.length > 0) {
      // Common audio encoding args
      audioOutputArgs.push('-c:a', 'aac', '-t', options.durationInSeconds.toString());

      if (audioInputs.length === 1) {
        // Map the single audio stream
        // 0:v is video, 1:a is audio (since video input is index 0, and we have 1 audio input at index 1)
        audioOutputArgs.push('-map', '0:v', '-map', '1:a');
      } else {
        // Mix multiple audio streams
        // Inputs are 1, 2, ..., N (since 0 is video)
        // amix filter: inputs=N:duration=longest
        // Note: duration=longest makes sure we use the duration of the longest input,
        // but we clamp it with -t anyway.
        const numAudioInputs = audioInputs.length;
        const filterComplex = `amix=inputs=${numAudioInputs}:duration=longest[aout]`;

        audioOutputArgs.push(
          '-filter_complex', filterComplex,
          '-map', '0:v',
          '-map', '[aout]'
        );
      }
    }

    const videoCodec = options.videoCodec || 'libx264';
    const pixelFormat = options.pixelFormat || 'yuv420p';

    const encodingArgs: string[] = [
      '-c:v', videoCodec,
      '-pix_fmt', pixelFormat,
      '-movflags', '+faststart',
    ];

    if (options.crf !== undefined) {
      encodingArgs.push('-crf', options.crf.toString());
    }

    if (options.preset) {
      encodingArgs.push('-preset', options.preset);
    }

    if (options.videoBitrate) {
      encodingArgs.push('-b:v', options.videoBitrate);
    }

    const outputArgs = [
      ...encodingArgs,
      ...audioOutputArgs,
      outputPath,
    ];

    return ['-y', ...videoInputArgs, ...audioInputArgs, ...outputArgs];
  }
}
