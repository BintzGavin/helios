import { RendererOptions, AudioTrackConfig, FFmpegConfig } from '../types.js';

export class FFmpegBuilder {
  static getArgs(options: RendererOptions, outputPath: string, videoInputArgs: string[]): FFmpegConfig {
    // 1. Normalize inputs into AudioTrackConfig objects
    const tracks: AudioTrackConfig[] = [];
    const inputBuffers: { index: number; buffer: Buffer }[] = [];
    // Start pipe index at 3 (0=stdin, 1=stdout, 2=stderr).
    // Note: If videoInputArgs uses a pipe (e.g. image2pipe from stdin), that's pipe 0.
    // FFmpeg is spawned with `stdio: ['pipe', 'pipe', 'pipe', ...extraPipes]`.
    // The standard inputs are mapped to file descriptors 0, 1, 2.
    // The first extra pipe is fd 3.
    let nextPipeIndex = 3;

    if (options.audioTracks && options.audioTracks.length > 0) {
      options.audioTracks.forEach(track => {
        if (typeof track === 'string') {
          tracks.push({ path: track, volume: 1.0, offset: 0, seek: 0 });
        } else {
          tracks.push({
            path: track.path,
            buffer: track.buffer,
            volume: track.volume ?? 1.0,
            offset: track.offset ?? 0,
            seek: track.seek ?? 0,
            fadeInDuration: track.fadeInDuration ?? 0,
            fadeOutDuration: track.fadeOutDuration ?? 0,
            loop: track.loop,
            playbackRate: track.playbackRate ?? 1.0,
          });
        }
      });
    } else if (options.audioFilePath) {
      tracks.push({ path: options.audioFilePath, volume: 1.0, offset: 0, seek: 0 });
    }

    const audioInputArgs: string[] = [];
    const audioFilterChains: string[] = [];
    const renderStartTime = (options.startFrame || 0) / options.fps;
    const compositionDuration = options.frameCount
      ? options.frameCount / options.fps
      : options.durationInSeconds;

    // 2. Process each track to generate inputs and filters
    tracks.forEach((track, index) => {
      // Handle Buffer -> Pipe mapping
      if (track.buffer) {
         const pipeIndex = nextPipeIndex++;
         // FFmpeg syntax for reading from a file descriptor: pipe:N
         track.path = `pipe:${pipeIndex}`;
         inputBuffers.push({ index: pipeIndex, buffer: track.buffer });
      }

      // Calculate effective seek and delay relative to render start
      const globalStart = track.offset || 0;
      let delayMs = 0;
      let inputSeek = track.seek || 0;

      if (globalStart > renderStartTime) {
        // Track starts after the render window begins
        // We need to delay the audio start relative to the video start
        delayMs = (globalStart - renderStartTime) * 1000;
        // inputSeek remains as configured (start playing from user's seek point)
      } else {
        // Track starts before or at the render window
        // We need to skip the part of the track that happened before renderStart
        delayMs = 0;
        inputSeek = (track.seek || 0) + (renderStartTime - globalStart);
      }

      // Add input arguments
      // Note: -ss before -i for fast seeking
      if (track.loop) {
        audioInputArgs.push('-stream_loop', '-1');
      }
      audioInputArgs.push('-ss', inputSeek.toString(), '-i', track.path);

      // Build filter chain for this input
      // Input index is index + 1 (since 0 is video)
      const inputId = `${index + 1}:a`;
      const outputLabel = `a${index}`;
      const filters: string[] = [];

      // Always force stereo to ensure channel consistency for mixing and delay
      filters.push('aformat=channel_layouts=stereo');

      // Apply Playback Rate (atempo)
      // Must be applied BEFORE delay because delay is time-based,
      // but if we speed up audio, the duration changes.
      // Actually, delay is usually absolute composition time,
      // so we apply it to the timeline.
      // However, atempo changes the duration of the clip itself.
      // Logic:
      // 1. atempo (changes duration)
      // 2. adelay (positions clip on timeline)
      // 3. volume/fade (amplitude)

      if (track.playbackRate && track.playbackRate !== 1.0 && track.playbackRate > 0) {
        let rate = track.playbackRate;

        // Safety check: Ensure rate is finite and reasonable
        if (!Number.isFinite(rate) || rate <= 0) {
          console.warn(`[FFmpegBuilder] Invalid playbackRate: ${rate}. Resetting to 1.0.`);
          rate = 1.0;
        } else {
          // atempo filter is limited to [0.5, 2.0]
          // We chain filters for values outside this range.
          while (rate > 2.0) {
            filters.push('atempo=2.0');
            rate /= 2.0;
          }
          while (rate < 0.5) {
            filters.push('atempo=0.5');
            rate /= 0.5;
          }
          // Apply remaining factor
          if (rate !== 1.0) {
             filters.push(`atempo=${rate}`);
          }
        }
      }

      if (delayMs > 0) {
        // Use adelay. We assume stereo (2 channels) due to aformat.
        // Format: adelay=L|R. We apply same delay to both.
        filters.push(`adelay=${delayMs}|${delayMs}`);
      }

      if (track.volume !== undefined && track.volume !== 1.0) {
        filters.push(`volume=${track.volume}`);
      }

      if (track.fadeInDuration && track.fadeInDuration > 0) {
        const startTime = delayMs / 1000;
        filters.push(`afade=t=in:st=${startTime}:d=${track.fadeInDuration}`);
      }

      if (track.fadeOutDuration && track.fadeOutDuration > 0) {
        let startTime = compositionDuration - track.fadeOutDuration;
        if (startTime < 0) startTime = 0;
        filters.push(`afade=t=out:st=${startTime}:d=${track.fadeOutDuration}`);
      }

      // Construct the chain: [in]filter,filter[out]
      audioFilterChains.push(`[${inputId}]${filters.join(',')}[${outputLabel}]`);
    });

    // 3. Prepare Video Filters (Subtitles)
    let videoFilterGraph = '';
    let videoMap = '0:v';
    const videoCodec = options.videoCodec || 'libx264';

    if (options.subtitles) {
      if (videoCodec === 'copy') {
        throw new Error('Cannot burn subtitles when videoCodec is set to "copy". Please use a transcoding codec (e.g. libx264).');
      }

      // Escape path for FFmpeg filter
      // 1. Replace backslashes with forward slashes
      // 2. Escape colons (for Windows drive letters like C:)
      // 3. Escape single quotes
      const escapedPath = options.subtitles
        .replace(/\\/g, '/')
        .replace(/:/g, '\\:')
        .replace(/'/g, "\\'");

      videoFilterGraph = `[0:v]subtitles='${escapedPath}'[vout]`;
      videoMap = '[vout]';
    }

    // 4. Prepare Audio Filters
    let audioFilterGraph = '';
    let audioMap = '';

    if (tracks.length > 0) {
      if (tracks.length === 1) {
        audioFilterGraph = audioFilterChains[0];
        audioMap = '[a0]';
      } else {
        // Multiple tracks: Mix them using amix
        let graph = audioFilterChains.join(';');
        // Mix step: combine all [aX] outputs
        const mixInputs = tracks.map((_, i) => `[a${i}]`).join('');
        // inputs=N:duration=longest
        graph += `;${mixInputs}amix=inputs=${tracks.length}:duration=longest[aout]`;

        audioFilterGraph = graph;
        audioMap = '[aout]';
      }
    }

    // 5. Construct Final Arguments
    const finalArgs: string[] = ['-y', ...videoInputArgs, ...audioInputArgs];

    // Combine filters
    const complexFilters: string[] = [];
    if (videoFilterGraph) complexFilters.push(videoFilterGraph);
    if (audioFilterGraph) complexFilters.push(audioFilterGraph);

    if (complexFilters.length > 0) {
      finalArgs.push('-filter_complex', complexFilters.join(';'));
    }

    // Map Video
    finalArgs.push('-map', videoMap);

    // Map Audio (if exists)
    if (audioMap) {
      finalArgs.push('-map', audioMap);
    }

    // Video Encoding Args
    finalArgs.push('-c:v', videoCodec);

    if (videoCodec === 'copy') {
      finalArgs.push('-movflags', '+faststart');
    } else {
      const pixelFormat = options.pixelFormat || 'yuv420p';
      finalArgs.push(
        '-pix_fmt', pixelFormat,
        '-movflags', '+faststart',
      );

      if (options.crf !== undefined) {
        finalArgs.push('-crf', options.crf.toString());
      }

      if (options.preset) {
        finalArgs.push('-preset', options.preset);
      }

      if (options.videoBitrate) {
        finalArgs.push('-b:v', options.videoBitrate);
      }
    }

    // Audio Encoding Args
    if (audioMap) {
      let audioCodec = options.audioCodec;
      if (!audioCodec) {
        if (videoCodec.startsWith('libvpx')) {
          audioCodec = 'libvorbis';
        } else {
          audioCodec = 'aac';
        }
      }

      const duration = options.frameCount
        ? options.frameCount / options.fps
        : options.durationInSeconds;

      finalArgs.push('-c:a', audioCodec, '-t', duration.toString());

      if (options.audioBitrate) {
        finalArgs.push('-b:a', options.audioBitrate);
      }
    }

    finalArgs.push(outputPath);

    return { args: finalArgs, inputBuffers };
  }
}
