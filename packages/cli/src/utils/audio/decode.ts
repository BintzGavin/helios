import { spawn } from 'child_process';
import fs from 'fs';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

export const ANALYSIS_SAMPLE_RATE = 44100;

/**
 * Decodes the first audio stream of a file with ffmpeg to mono 32-bit float PCM at 44.1 kHz,
 * handing the samples to onSamples as they arrive. Resolves with the number of samples.
 */
export function decodeAudio(
  file: string,
  onSamples: (samples: Float32Array) => void,
  ffmpegPath: string = ffmpeg.path,
): Promise<number> {
  if (!fs.existsSync(file)) {
    return Promise.reject(new Error(`${file} does not exist. Pass the path to an audio file (mp3, wav, m4a, flac…).`));
  }
  if (fs.statSync(file).isDirectory()) {
    return Promise.reject(new Error(`${file} is a directory. Pass the path to an audio file.`));
  }

  const args = [
    '-nostdin', '-v', 'error',
    '-i', file,
    '-map', '0:a:0',
    '-vn', '-ac', '1', '-ar', String(ANALYSIS_SAMPLE_RATE),
    '-f', 'f32le', '-acodec', 'pcm_f32le',
    'pipe:1',
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let total = 0;
    // Bytes of a float split across two stdout chunks.
    let carry = new Uint8Array(0);
    let failed = false;

    proc.stdout.on('data', (chunk: Buffer) => {
      if (failed) return;
      // Copy into a fresh buffer, which is 4-byte aligned (a Buffer's byteOffset can be anything).
      const bytes = new Uint8Array(carry.length + chunk.length);
      bytes.set(carry, 0);
      bytes.set(chunk, carry.length);
      const whole = bytes.length - (bytes.length % 4);
      carry = bytes.slice(whole);
      if (whole === 0) return;
      const samples = new Float32Array(bytes.buffer, 0, whole / 4);
      total += samples.length;
      try {
        onSamples(samples);
      } catch (err) {
        failed = true;
        proc.kill();
        reject(err);
      }
    });
    proc.stderr.on('data', (data: Buffer) => {
      if (stderr.length < 8192) stderr += data.toString();
    });
    proc.on('error', (err: NodeJS.ErrnoException) => {
      failed = true;
      reject(
        err.code === 'ENOENT'
          ? new Error(`ffmpeg was not found at ${ffmpegPath}. Reinstall @helios-project/cli to restore it.`)
          : err,
      );
    });
    proc.on('close', (code) => {
      if (failed) return;
      if (code !== 0) {
        const detail = stderr.trim().split('\n').filter(Boolean).pop() ?? `exit code ${code}`;
        if (/matches no streams/i.test(stderr)) {
          reject(new Error(`${file} has no audio stream.`));
        } else {
          reject(new Error(`ffmpeg could not decode ${file}: ${detail}`));
        }
        return;
      }
      resolve(total);
    });
  });
}
