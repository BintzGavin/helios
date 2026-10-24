import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { Renderer } from '../src/Renderer.js';
import { filterImplicitAudioTracks } from '../src/utils/implicit-audio.js';

async function verify() {
  const directory = mkdtempSync(path.join(tmpdir(), 'helios-video-audio-'));
  const run = (args: string[]) => execFileSync(ffmpeg.path, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
  try {
    const video = path.join(directory, 'video.mp4');
    const audio = path.join(directory, 'audio.mp4');
    run(['-f', 'lavfi', '-i', 'testsrc2=size=160x90:rate=10', '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', video]);
    run(['-i', video, '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '1', '-c:v', 'copy', '-c:a', 'aac', audio]);

    // Blob inputs and duplicate sources must follow the same stream detection.
    const buffer = readFileSync(video);
    assert.deepEqual(await filterImplicitAudioTracks([{ path: 'blob-memory', buffer }]), []);
    const audible = { path: 'blob-memory', buffer: readFileSync(audio), volume: 0.7 };
    assert.deepEqual(await filterImplicitAudioTracks([audible, audible]), [audible, audible]);
    assert.deepEqual(await filterImplicitAudioTracks([{ path: audio, volume: 0 }]), []);
    const invalid = { path: path.join(directory, 'missing.mp4') };
    assert.deepEqual(await filterImplicitAudioTracks([invalid]), [invalid], 'Do not hide invalid-source errors');
    await assert.rejects(filterImplicitAudioTracks([{ path: video }], path.join(directory, 'missing-ffmpeg')));

    for (const mode of ['dom', 'canvas'] as const) {
      for (const hasAudio of [false, true]) {
        for (const muted of [false, true]) {
          const name = `${mode}-${hasAudio ? 'audio' : 'video-only'}-${muted ? 'muted' : 'audible'}`;
          const html = path.join(directory, `${name}.html`);
          const output = path.join(directory, `${name}.mp4`);
          writeFileSync(html, `<style>body{margin:0}video{position:absolute}canvas{position:absolute}</style>
            <video preload="auto" ${muted ? 'muted' : ''} src="${hasAudio ? 'audio' : 'video'}.mp4" width="160" height="90"></video>
            <canvas width="160" height="90"></canvas><script>
            const v=document.querySelector('video'),c=document.querySelector('canvas');
            function draw(){if(v.readyState>=2)c.getContext('2d').drawImage(v,0,0,160,90);requestAnimationFrame(draw)}draw();
            </script>`);
          await new Renderer({ width: 160, height: 90, fps: 10, durationInSeconds: 1, mode }).render(pathToFileURL(html).href, output);
          const probe = spawnSync(ffmpeg.path, ['-hide_banner', '-i', output], { encoding: 'utf8' });
          assert.equal(/Stream #.*Audio:/.test(probe.stderr), hasAudio && !muted, `${name}: output audio`);
          const frames = run(['-i', output, '-an', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
          const frameSize = 160 * 90 * 3;
          assert.equal(frames.length, frameSize * 10, `${name}: frame count and dimensions`);
          assert.notDeepEqual(frames.subarray(0, frameSize), frames.subarray(-frameSize), `${name}: footage advances`);
          if (hasAudio && !muted) {
            const pcm = run(['-i', output, '-vn', '-f', 's16le', 'pipe:1']);
            assert(pcm.some(byte => byte !== 0), `${name}: audio remains audible`);
          }
          console.log(`PASS ${name}`);
        }
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
