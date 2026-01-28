import { spawnSync } from 'child_process';

export interface FFmpegDiagnostics {
  path: string;
  present: boolean;
  version?: string;
  encoders: string[];
  filters: string[];
  error?: string;
}

export class FFmpegInspector {
  public static inspect(ffmpegPath: string): FFmpegDiagnostics {
    const result: FFmpegDiagnostics = {
      path: ffmpegPath,
      present: false,
      encoders: [],
      filters: [],
    };

    try {
      // Check Version
      const versionProc = spawnSync(ffmpegPath, ['-version'], { encoding: 'utf-8' });
      if (versionProc.error) {
        throw versionProc.error;
      }
      if (versionProc.status !== 0) {
        throw new Error(`Exited with code ${versionProc.status}`);
      }

      result.present = true;
      const versionLines = versionProc.stdout.split('\n');
      if (versionLines.length > 0) {
        // Extract "ffmpeg version X.Y.Z"
        // Example: "ffmpeg version n5.1.2 Copyright (c) 2000-2022 the FFmpeg developers"
        const match = versionLines[0].match(/ffmpeg version (\S+)/);
        if (match) {
          result.version = match[1];
        } else {
            result.version = versionLines[0].trim();
        }
      }

      // Check Encoders
      const encodersProc = spawnSync(ffmpegPath, ['-encoders'], { encoding: 'utf-8' });
      if (!encodersProc.error && encodersProc.status === 0) {
        const lines = encodersProc.stdout.split('\n');
        for (const line of lines) {
            // Format: " V..... libx264              x264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10"
            const trimmed = line.trim();
            // We look for V (Video) or A (Audio) at start
            // Regex: Start, space, [V/A/S]..... space, encoder_name, space
            const match = trimmed.match(/^[VAS][\.\w]{5}\s+(\S+)/);
            if (match) {
                result.encoders.push(match[1]);
            }
        }
      }

      // Check Filters
      const filtersProc = spawnSync(ffmpegPath, ['-filters'], { encoding: 'utf-8' });
      if (!filtersProc.error && filtersProc.status === 0) {
        const lines = filtersProc.stdout.split('\n');
        for (const line of lines) {
            // Format: " T.. subtitles         V->V       Read captions..."
            // Regex: ... name ...
            // The format is: " [T.][S.][C.] name space ..."
            // Often just " ... name "
            const match = line.match(/^\s+[\w\.]{3}\s+(\S+)/);
            if (match) {
                result.filters.push(match[1]);
            }
        }
      }

    } catch (err: any) {
      result.error = err.message;
      result.present = false;
    }

    return result;
  }
}
