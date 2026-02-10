import { Renderer } from '../src/index';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as url from 'url';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ffmpegPath = ffmpeg.path;

const outputDir = path.join(__dirname, '..', 'output-verify-audio');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const audio1Path = path.join(outputDir, 'audio1.wav');
const audio2Path = path.join(outputDir, 'audio2.wav');
const outputVideoPath = path.join(outputDir, 'output.mp4');
const htmlPath = path.join(outputDir, 'index.html');

// Cleanup
if (fs.existsSync(audio1Path)) fs.unlinkSync(audio1Path);
if (fs.existsSync(audio2Path)) fs.unlinkSync(audio2Path);
if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);

// Create dummy HTML
fs.writeFileSync(htmlPath, '<html><body><div style="width:640px;height:480px;background:red;"></div></body></html>');

async function generateAudio(filename: string, freq: number) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      '-y',
      '-f', 'lavfi',
      '-i', `sine=frequency=${freq}:duration=1`,
      filename
    ];
    console.log(`Generating audio: ${filename}`);
    const proc = spawn(ffmpegPath, args);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed with code ${code}`));
    });
  });
}

async function verifyAudio(filename: string) {
    return new Promise<boolean>((resolve, reject) => {
        const args = ['-i', filename];
        const proc = spawn(ffmpegPath, args);
        let stderr = '';
        proc.stderr.on('data', (data) => stderr += data.toString());
        proc.on('close', () => {
             // Look for "Audio: aac"
             if (stderr.includes('Audio: aac')) {
                 console.log('Audio stream detected.');
                 resolve(true);
             } else {
                 console.error('No audio stream detected.');
                 console.error(stderr);
                 resolve(false);
             }
        });
    });
}

async function run() {
  console.log('Generating dummy audio files...');
  await generateAudio(audio1Path, 440); // A4
  await generateAudio(audio2Path, 880); // A5

  console.log('Initializing Renderer...');
  const renderer = new Renderer({
    width: 640,
    height: 480,
    fps: 30,
    durationInSeconds: 1,
    audioTracks: [audio1Path, audio2Path],
    ffmpegPath: ffmpegPath,
    mode: 'dom' // Use DomStrategy simply because it doesn't require WebCodecs/Canvas setup
  });

  console.log(`Rendering to ${outputVideoPath}...`);
  // We need a file:// URL for the HTML file
  const fileUrl = url.pathToFileURL(htmlPath).toString();

  await renderer.render(fileUrl, outputVideoPath);

  console.log('Verifying output...');
  if (fs.existsSync(outputVideoPath)) {
      console.log('Output file exists.');
      const hasAudio = await verifyAudio(outputVideoPath);
      if (hasAudio) {
          console.log('SUCCESS: Audio mixing verified.');
      } else {
          console.error('FAILURE: Audio stream missing.');
          process.exit(1);
      }
  } else {
      console.error('FAILURE: Output file does not exist.');
      process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
