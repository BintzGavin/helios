import { RendererOptions, AudioTrackConfig } from '../types.js';

export class FFmpegBuilder {
  static getArgs(options: RendererOptions, outputPath: string, videoInputArgs: string[]): string[] {
    // 1. Normalize inputs into AudioTrackConfig objects
    const tracks: AudioTrackConfig[] = [];

    if (options.audioTracks && options.audioTracks.length > 0) {
      options.audioTracks.forEach(track => {
        if (typeof track === 'string') {
          tracks.push({ path: track, volume: 1.0, offset: 0, seek: 0 });
        } else {
          tracks.push({
            path: track.path,
            volume: track.volume ?? 1.0,
            offset: track.offset ?? 0,
            seek: track.seek ?? 0
          });
        }
      });
    } else if (options.audioFilePath) {
      tracks.push({ path: options.audioFilePath, volume: 1.0, offset: 0, seek: 0 });
    }

    const audioInputArgs: string[] = [];
    const audioFilterChains: string[] = [];
    const renderStartTime = (options.startFrame || 0) / options.fps;

    // 2. Process each track to generate inputs and filters
    tracks.forEach((track, index) => {
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
      audioInputArgs.push('-ss', inputSeek.toString(), '-i', track.path);

      // Build filter chain for this input
      // Input index is index + 1 (since 0 is video)
      const inputId = `${index + 1}:a`;
      const outputLabel = `a${index}`;
      const filters: string[] = [];

      // Always force stereo to ensure channel consistency for mixing and delay
      filters.push('aformat=channel_layouts=stereo');

      if (delayMs > 0) {
        // Use adelay. We assume stereo (2 channels) due to aformat.
        // Format: adelay=L|R. We apply same delay to both.
        filters.push(`adelay=${delayMs}|${delayMs}`);
      }

      if (track.volume !== undefined && track.volume !== 1.0) {
        filters.push(`volume=${track.volume}`);
      }

      // Construct the chain: [in]filter,filter[out]
      audioFilterChains.push(`[${inputId}]${filters.join(',')}[${outputLabel}]`);
    });

    // 3. Build Video Filters (Subtitles)
    let videoFilterPart = '';
    let videoMap = '0:v';

    if (options.subtitles) {
      if (options.videoCodec === 'copy') {
        throw new Error("Cannot burn subtitles when videoCodec is 'copy'. Please use a re-encoding codec like 'libx264'.");
      }
      // Escape path for FFmpeg filter
      // Windows paths need backslashes converted to forward slashes
      // Colons (drive letters) need escaping
      // Quotes need escaping
      const escapedPath = options.subtitles
        .replace(/\\/g, '/')
        .replace(/:/g, '\\:')
        .replace(/'/g, "\\'");

      videoFilterPart = `[0:v]subtitles='${escapedPath}'[vout]`;
      videoMap = '[vout]';
    }

    // 4. Build Audio Filters Logic
    let audioFilterPart = '';
    let audioMap = '';

    if (tracks.length > 0) {
      if (tracks.length === 1) {
        // Single track
        audioFilterPart = audioFilterChains[0];
        audioMap = '[a0]';
      } else {
        // Multiple tracks: Mix them using amix
        let filterGraph = audioFilterChains.join(';');
        const mixInputs = tracks.map((_, i) => `[a${i}]`).join('');
        // inputs=N:duration=longest
        filterGraph += `;${mixInputs}amix=inputs=${tracks.length}:duration=longest[aout]`;

        audioFilterPart = filterGraph;
        audioMap = '[aout]';
      }
    }

    // 5. Determine Codecs and Encoding Args
    const videoCodec = options.videoCodec || 'libx264';
    const encodingArgs: string[] = ['-c:v', videoCodec];

    if (videoCodec === 'copy') {
      encodingArgs.push('-movflags', '+faststart');
    } else {
      const pixelFormat = options.pixelFormat || 'yuv420p';
      encodingArgs.push(
        '-pix_fmt', pixelFormat,
        '-movflags', '+faststart',
      );

      if (options.crf !== undefined) {
        encodingArgs.push('-crf', options.crf.toString());
      }

      if (options.preset) {
        encodingArgs.push('-preset', options.preset);
      }

      if (options.videoBitrate) {
        encodingArgs.push('-b:v', options.videoBitrate);
      }
    }

    const audioOutputArgs: string[] = [];
    if (tracks.length > 0) {
      // Determine Audio Codec
      let audioCodec = options.audioCodec;
      if (!audioCodec) {
        if (videoCodec.startsWith('libvpx')) {
          audioCodec = 'libvorbis';
        } else {
          audioCodec = 'aac';
        }
      }

      // Common audio encoding args
      audioOutputArgs.push('-c:a', audioCodec, '-t', options.durationInSeconds.toString());

      if (options.audioBitrate) {
        audioOutputArgs.push('-b:a', options.audioBitrate);
      }
    }

    // 6. Combine Filters and Maps
    const complexFilters: string[] = [];
    if (videoFilterPart) complexFilters.push(videoFilterPart);
    if (audioFilterPart) complexFilters.push(audioFilterPart);

    const filterComplexArgs: string[] = [];
    if (complexFilters.length > 0) {
      filterComplexArgs.push('-filter_complex', complexFilters.join(';'));
    }

    const mappingArgs: string[] = [];
    mappingArgs.push('-map', videoMap);
    if (audioMap) mappingArgs.push('-map', audioMap);

    const outputArgs = [
      ...filterComplexArgs,
      ...mappingArgs,
      ...encodingArgs,
      ...audioOutputArgs,
      outputPath,
    ];

    return ['-y', ...videoInputArgs, ...audioInputArgs, ...outputArgs];
  }
}
