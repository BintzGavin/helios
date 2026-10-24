import { spawn } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { AudioTrackConfig } from '../types.js';

// Browser media elements do not reliably expose whether their source has audio.
// Inspect with the same FFmpeg binary used for encoding, after blob extraction.
export async function filterImplicitAudioTracks(
  tracks: AudioTrackConfig[],
  ffmpegPath: string = ffmpeg.path,
  timeout: number = 30000
): Promise<AudioTrackConfig[]> {
  const probes = new Map<string | Buffer, Promise<boolean>>();
  const result: AudioTrackConfig[] = [];
  for (const track of tracks) {
    if (track.volume === 0) continue;
    const key = track.buffer || track.path;
    let probe = probes.get(key);
    if (!probe) {
      probe = new Promise<boolean>((resolve, reject) => {
        const child = spawn(ffmpegPath, ['-hide_banner', '-i', track.buffer ? 'pipe:0' : track.path], {
          stdio: ['pipe', 'ignore', 'pipe']
        });
        let diagnostics = '';
        let truncated = false;
        const timer = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error('Timed out inspecting implicit audio stream'));
        }, timeout);
        child.stderr.on('data', chunk => {
          if (diagnostics.length < 1024 * 1024) diagnostics += chunk.toString();
          else truncated = true;
        });
        child.stdin.on('error', error => {
          if ((error as NodeJS.ErrnoException).code !== 'EPIPE') reject(error);
        });
        child.on('error', error => { clearTimeout(timer); reject(error); });
        child.on('close', (code, signal) => {
          clearTimeout(timer);
          // An input-only probe normally exits nonzero. Only exclude confirmed
          // video-only inputs; leave unreadable/invalid sources for the encoder
          // to report rather than silently dropping potentially valid audio.
          const hasAudio = /^\s*Stream #.*Audio:/m.test(diagnostics);
          const hasVideo = /^\s*Stream #.*Video:/m.test(diagnostics);
          const complete = code === 1 && !signal && !truncated &&
            diagnostics.includes('At least one output file must be specified');
          resolve(!complete || hasAudio || !hasVideo);
        });
        child.stdin.end(track.buffer);
      });
      probes.set(key, probe);
    }
    if (await probe) result.push(track);
  }
  return result;
}
