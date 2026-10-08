import { RendererOptions, AudioTrackConfig, FFmpegConfig } from '../types.js';

// Y'CbCr pixel formats (yuv420p, yuva420p, yuv422p10le, nv12, p010le). Excludes RGB, grey and
// palette formats, and the full-range yuvj* formats, which JPEG defines as BT.601.
const YUV_PIXEL_FORMAT = /^(yuva?\d|nv\d|p\d{3})/;
// Encoders that store RGB or palette pixels, or whose format fixes the matrix at BT.601
// (JPEG, WebP). Converting or tagging their frames as BT.709 would shift their colours.
const NON_VIDEO_ENCODER = /^(gif|a?png|mjpeg|ljpeg|jpegls|libwebp|libwebp_anim|libx264rgb|qtrle|bmp|tiff|targa|ppm|pam|rawvideo)(_|$)/;

/**
 * Pages are drawn in sRGB. Convert the frames to Y'CbCr with the BT.709 matrix in limited
 * range and tag the stream to match. Untagged, players guess, and FFmpeg's default
 * conversion is BT.601, so HD output looked washed out with shifted reds. The tags match
 * @helios-project/portable's. Returns null for outputs that are not Y'CbCr video.
 */
function bt709Encoding(videoCodec: string, pixelFormat: string): { filters: string[]; args: string[] } | null {
  if (videoCodec === 'copy' || NON_VIDEO_ENCODER.test(videoCodec) || !YUV_PIXEL_FORMAT.test(pixelFormat)) {
    return null;
  }
  return {
    // in_color_matrix stays "auto": JPEG and WebP intermediates decode as BT.601, untagged
    // video as BT.601, tagged video as tagged. bicubic is FFmpeg's default scaler.
    // setparams tags the frames as well as the stream: ProRes writes each frame's own
    // tags into its frame header, and they would otherwise say BT.601 after a JPEG input.
    filters: [
      'scale=out_color_matrix=bt709:out_range=tv:flags=bicubic+accurate_rnd+full_chroma_int+full_chroma_inp',
      `format=${pixelFormat}`,
      'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
    ],
    args: ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'],
  };
}

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
            duration: track.duration,
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
        const playbackRate = track.playbackRate && Number.isFinite(track.playbackRate) && track.playbackRate > 0 ? track.playbackRate : 1.0;
        inputSeek = (track.seek || 0) + (renderStartTime - globalStart) * playbackRate;
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
        let fadeOutStartTime = compositionDuration - track.fadeOutDuration;

        // Smart Fades: If track is not looping and has a known duration,
        // calculate fade-out relative to the clip's end.
        if (!track.loop && track.duration) {
          const playbackRate = track.playbackRate && Number.isFinite(track.playbackRate) && track.playbackRate > 0 ? track.playbackRate : 1.0;

          // inputSeek is the start position in the source file
          // We must clamp remaining duration to be at least 0
          const remainingSourceDuration = Math.max(0, track.duration - inputSeek);
          const durationInStream = remainingSourceDuration / playbackRate;
          const clipEndTime = (delayMs / 1000) + durationInStream;

          fadeOutStartTime = clipEndTime - track.fadeOutDuration;
        }

        if (fadeOutStartTime < 0) fadeOutStartTime = 0;
        filters.push(`afade=t=out:st=${fadeOutStartTime}:d=${track.fadeOutDuration}`);
      }

      // Construct the chain: [in]filter,filter[out]
      audioFilterChains.push(`[${inputId}]${filters.join(',')}[${outputLabel}]`);
    });

    // 3. Prepare Video Filters (Subtitles, then the BT.709 conversion)
    let videoFilterGraph = '';
    let videoMap = '0:v';
    const videoCodec = options.videoCodec || 'libx264';
    const pixelFormat = options.pixelFormat || 'yuv420p';
    const colorEncoding = bt709Encoding(videoCodec, pixelFormat);
    const videoFilters: string[] = [];

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

      // Burn subtitles in before the conversion, while the frames are still in the
      // source's RGB or BT.601 encoding that the subtitles filter assumes.
      videoFilters.push(`subtitles='${escapedPath}'`);
    }

    if (colorEncoding) {
      videoFilters.push(...colorEncoding.filters);
    }

    if (videoFilters.length > 0) {
      videoFilterGraph = `[0:v]${videoFilters.join(',')}[vout]`;
      videoMap = '[vout]';
    }

    // 4. Prepare Audio Filters
    let audioFilterGraph = '';
    let audioMap = '';

    const shouldMixInput = options.mixInputAudio === true;

    if (tracks.length > 0 || shouldMixInput) {
      if (tracks.length === 0 && shouldMixInput) {
        // No extra tracks, just pass through input audio
        // We assume input 0 is the video file which contains the audio stream
        audioMap = '0:a';
      } else if (tracks.length === 1 && !shouldMixInput) {
        audioFilterGraph = audioFilterChains[0];
        audioMap = '[a0]';
      } else {
        // Multiple tracks (or single track + input): Mix them using amix
        let graph = audioFilterChains.join(';');

        let mixInputs = tracks.map((_, i) => `[a${i}]`).join('');
        let inputCount = tracks.length;

        if (shouldMixInput) {
          // Prepend 0:a to the mix inputs
          mixInputs = `[0:a]${mixInputs}`;
          inputCount++;
        }

        // Mix step: combine all [aX] outputs (and [0:a] if needed)
        // inputs=N:duration=longest
        // Note: If filter chains existed, we append the amix
        const separator = graph ? ';' : '';
        graph += `${separator}${mixInputs}amix=inputs=${inputCount}:duration=longest[aout]`;

        audioFilterGraph = graph;
        audioMap = '[aout]';
      }
    }

    // 5. Construct Final Arguments
    const finalArgs: string[] = ['-y'];

    if (options.hwAccel) {
      finalArgs.push('-hwaccel', options.hwAccel);
    }

    finalArgs.push(...videoInputArgs, ...audioInputArgs);

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
      finalArgs.push('-pix_fmt', pixelFormat);

      if (colorEncoding) {
        // write_colr: MP4/MOV get a 'colr' atom too (older FFmpeg builds, like the
        // bundled one, only write it when asked). Other muxers ignore movflags.
        finalArgs.push(...colorEncoding.args, '-movflags', '+faststart+write_colr');
      } else {
        finalArgs.push('-movflags', '+faststart');
      }

      if (options.crf !== undefined) {
        finalArgs.push('-crf', options.crf.toString());
      }

      if (options.preset) {
        finalArgs.push('-preset', options.preset);
      } else if (videoCodec === 'libx264' || videoCodec === 'libx265') {
        finalArgs.push('-preset', 'ultrafast');
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
