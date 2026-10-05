#!/usr/bin/env node
// Measures in-view export inside the ext-apps basic-host: speed, file size, and how close the
// frames are to `helios still` (PSNR/SSIM with ffmpeg), plus a `helios render` baseline.
//
// Needs, already running: basic-host on :8080/:8081 and `server.mjs` on :3001
// (setup in docs/rfcs/2026-10-05-in-view-export.md, "Method").
//   node tests/spikes/in-view-export/measure.mjs [--csp none|fonts] [--channel chromium] [--runs 2] [--skip-baseline]
import fs from 'fs';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { launch, openView, runExport } from './host.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const root = path.join(here, 'out/root');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const csp = arg('--csp', 'none');
const channel = arg('--channel', undefined);
const runs = Number(arg('--runs', '2'));
const skipBaseline = process.argv.includes('--skip-baseline');
const outDir = path.join(here, 'out', `measure-${csp}-${channel || 'headless-shell'}`);
fs.mkdirSync(outDir, { recursive: true });

const FPS = 30;
const DURATION = 5;
const TIMES = [0.4, 1, 1.7, 2.6, 4.2];
const FRAMES = TIMES.map((t) => Math.round(t * FPS));
const SIZES = { '720p': [1280, 720], '1080p': [1920, 1080] };

const CASES = [
  { page: 'canvas', mode: 'canvas', variants: { default: {} } },
  {
    page: 'dom-font', mode: 'dom', variants: {
      'stock capture': { untaint: false, inline: false, bake: false },
      'untainted only': { inline: false, bake: false },
      'untainted + inline': { inline: true, bake: false },
      'untainted + inline + bake': { inline: true, bake: true },
    },
  },
  {
    page: 'gsap', mode: 'dom', variants: {
      'untainted only': { inline: false, bake: false },
      'untainted + inline + bake': { inline: true, bake: true },
    },
  },
];

function ffmpegCompare(a, b) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-lavfi',
    '[0:v]format=rgb24,split[a0][a1];[1:v]format=rgb24,split[b0][b1];[a0][b0]psnr;[a1][b1]ssim', '-f', 'null', '-'], { encoding: 'utf8' });
  const err = r.stderr;
  const psnr = /PSNR .*average:([\d.]+|inf)/.exec(err);
  const ssim = /SSIM .*All:([\d.]+)/.exec(err);
  return { psnr: psnr ? (psnr[1] === 'inf' ? Infinity : Number(psnr[1])) : null, ssim: ssim ? Number(ssim[1]) : null };
}

function extractFrame(mp4, n, png) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', mp4, '-vf', `select=eq(n\\,${n})`, '-fps_mode', 'passthrough', '-frames:v', '1', png]);
}

function probe(mp4) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames', '-show_entries',
    'stream=codec_name,profile,width,height,nb_read_frames,r_frame_rate,avg_frame_rate,duration,bit_rate', '-of', 'json', mp4], { encoding: 'utf8' }));
  return j.streams[0];
}

function helios(args) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(repo, 'packages/cli/bin/helios.js'), ...args], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`helios ${args.join(' ')} failed:\n${r.stderr || r.stdout}`);
  return (Date.now() - t0) / 1000;
}

function savePng(dataUrl, file) {
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
}

const results = { csp, channel: channel || 'chromium-headless-shell', fps: FPS, duration: DURATION, times: TIMES, cases: [] };

// 1. Reference stills from the CLI, 1080p.
for (const c of CASES) {
  const dir = path.join(outDir, 'stills', c.page);
  if (!fs.existsSync(path.join(dir, `still-${TIMES[0]}s.png`))) {
    fs.mkdirSync(dir, { recursive: true });
    helios(['still', `pages/${c.page}.html`, '--at', TIMES.join(','), '-o', dir, '--width', '1920', '--height', '1080']);
  }
}

// 2. Local render baseline (helios render, default preset), 1080p.
const baseline = {};
if (!skipBaseline) {
  for (const c of CASES) {
    const mp4 = path.join(outDir, `render-${c.page}.mp4`);
    const secs = helios(['render', `pages/${c.page}.html`, '-o', mp4, '--width', '1920', '--height', '1080', '--fps', String(FPS), '--duration', String(DURATION)]);
    const frames = TIMES.map((t, i) => {
      const png = path.join(outDir, `render-${c.page}-f${FRAMES[i]}.png`);
      extractFrame(mp4, FRAMES[i], png);
      return { t, ...ffmpegCompare(png, path.join(outDir, 'stills', c.page, `still-${t}s.png`)) };
    });
    baseline[c.page] = { wallSeconds: secs, secondsPerVideoSecond: secs / DURATION, bytes: fs.statSync(mp4).size, probe: probe(mp4), frames };
    console.error(`baseline ${c.page}: ${secs.toFixed(1)} s, ${(baseline[c.page].bytes / 1e6).toFixed(2)} MB`);
  }
  results.baseline = baseline;
}

// 3. In-view export in basic-host.
const browser = await launch(channel);
results.browserVersion = browser.version();
for (const c of CASES) {
  for (const [variant, vopts] of Object.entries(c.variants)) {
    for (const [sizeName, [w, h]] of Object.entries(SIZES)) {
      // Accuracy is measured at 1080p; 720p runs only the default/best variant for speed.
      const best = variant === Object.keys(c.variants).at(-1);
      if (sizeName === '720p' && !best) continue;
      for (let run = 1; run <= (best ? runs : 1); run++) {
        const log = [];
        const entry = { page: c.page, variant, size: sizeName, run };
        const { ctx, view } = await openView(browser, { path: `pages/${c.page}.html`, duration: DURATION, width: w, height: h, fps: FPS }, { log });
        try {
          const wall0 = Date.now();
          const r = await runExport(view, {
            mode: c.mode, ...vopts, deliver: ['save_export'], chunkBytes: 4 * 1024 * 1024,
            sampleFrames: sizeName === '1080p' && run === 1 ? FRAMES : [],
          });
          entry.wallSeconds = (Date.now() - wall0) / 1000;
          Object.assign(entry, {
            exportSeconds: r.totalMs / 1000, secondsPerVideoSecond: r.totalMs / 1000 / DURATION,
            seekSeconds: r.seekMs / 1000, captureSeconds: r.captureMs / 1000, inlineSeconds: r.inlineMs / 1000,
            encodeAndOtherSeconds: (r.totalMs - r.seekMs - r.captureMs - r.inlineMs) / 1000,
            bytes: r.bytes, inlineReport: r.inlineReport, warningCount: r.warningCount, warnings: r.warnings,
            saveExport: { ok: r.delivery.saveExport.ok, ms: r.delivery.saveExport.ms, chunks: r.delivery.saveExport.chunks, error: r.delivery.saveExport.error },
          });
          const saved = r.delivery.saveExport.absolutePath;
          if (saved) {
            const mp4 = path.join(outDir, `view-${c.page}-${variant.replace(/[^a-z0-9]+/gi, '_')}-${sizeName}-run${run}.mp4`);
            fs.copyFileSync(saved, mp4);
            entry.probe = probe(mp4);
            if (sizeName === '1080p' && run === 1) {
              entry.frames = TIMES.map((t, i) => {
                const still = path.join(outDir, 'stills', c.page, `still-${t}s.png`);
                const raw = path.join(outDir, `view-${c.page}-${variant.replace(/[^a-z0-9]+/gi, '_')}-raw-f${FRAMES[i]}.png`);
                const enc = raw.replace('-raw-', '-enc-');
                savePng(r.samples[FRAMES[i]], raw);
                extractFrame(mp4, FRAMES[i], enc);
                return { t, frame: FRAMES[i], captured: ffmpegCompare(raw, still), encoded: ffmpegCompare(enc, still) };
              });
            }
          }
        } catch (e) {
          entry.error = String(e.message).split('\n')[0].slice(0, 400);
        }
        entry.consoleErrors = log.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]')).length;
        await ctx.close();
        results.cases.push(entry);
        console.error(`${c.page} / ${variant} / ${sizeName} run ${run}: ` +
          (entry.error ? 'ERROR ' + entry.error : `${entry.exportSeconds.toFixed(2)} s export (${entry.secondsPerVideoSecond.toFixed(3)} s per video s), ${(entry.bytes / 1e6).toFixed(2)} MB` +
            (entry.frames ? ', PSNR captured ' + entry.frames.map((f) => f.captured.psnr?.toFixed(1)).join('/') + ', encoded ' + entry.frames.map((f) => f.encoded.psnr?.toFixed(1)).join('/') : '')));
      }
    }
  }
}
await browser.close();

const file = path.join(outDir, 'results.json');
fs.writeFileSync(file, JSON.stringify(results, null, 2));
console.error(`Wrote ${path.relative(repo, file)}`);
