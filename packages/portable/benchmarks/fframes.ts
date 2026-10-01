import { readFile, writeFile, mkdir, open, rename } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cpus, availableParallelism, platform, arch, totalmem } from 'node:os';
import { createHash } from 'node:crypto';
import { probeVideo } from '../src/render.js';
import { TEXT_GRID } from './fframes-textgrid.mjs';

const PIN = 'bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b';
const FONT_SHA256 = '9ae2da663d64342031e59b5fa680dd355171d021b7ebf83774efc7c0330ae7b5';
const args = process.argv.slice(2), value = (name: string, fallback = '') => {
  const index = args.indexOf(name); if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing value for ${name}`);
  return args[index + 1];
};
const out = resolve(value('--out', '/tmp/helios-fframes-benchmark'));
const execute = promisify(execFile);
const tools = { ffmpeg: value('--ffmpeg', 'ffmpeg'), ffprobe: value('--ffprobe', 'ffprobe') };
const workers = Number(value('--workers', '4')), encoderThreads = Number(value('--encoder-threads', '2'));
const fframesWorkers = Number(value('--fframes-workers', String(workers))), fframesEncoderThreads = Number(value('--fframes-encoder-threads', String(encoderThreads)));
const conversion = value('--color-conversion', 'rgb-bt601');
const crf = Number(value('--crf', '18'));
if (!Number.isFinite(crf) || crf < 0 || crf > 51) throw new Error('Invalid CRF');
await mkdir(out, { recursive: true });

async function encoderInfo(video: string) {
  const file = await open(video, 'r'), bytes = Buffer.alloc(2 * 1024 * 1024);
  let size: number;
  try { size = (await file.read(bytes, 0, bytes.length, 0)).bytesRead; } finally { await file.close(); }
  const text = bytes.subarray(0, size).toString('latin1').match(/x264 - core[^\0]+/)?.[0];
  if (!text) throw new Error('Missing x264 encoder metadata');
  const parameters = Object.fromEntries(['threads', 'lookahead_threads', 'bframes', 'keyint', 'crf', 'qpmin', 'qpmax', 'qcomp', 'qpstep', 'scenecut'].map(key => [key, Number(text.match(new RegExp(`(?<![A-Za-z_])${key}=([0-9.]+)`))?.[1])]));
  return { version: text.split(' - H.264')[0], parameters };
}

async function run(command: string, commandArgs: string[], label: string) {
  const stdout = await open(join(out, `${label}.stdout.log`), 'w'), stderr = await open(join(out, `${label}.stderr.log`), 'w');
  let peak: number | null = null, sampling = false;
  const started = performance.now();
  const child = spawn(command, commandArgs, { stdio: ['ignore', stdout.fd, stderr.fd], shell: false });
  const sample = async () => {
    if (sampling || !child.pid) return; sampling = true;
    try {
      const { stdout: text } = await execute('ps', ['-A', '-o', 'pid=,ppid=,rss=']);
      const rows = text.trim().split('\n').map(line => line.trim().split(/\s+/).map(Number)), ids = new Set([child.pid]);
      for (let changed = true; changed;) { changed = false; for (const [pid, parent] of rows) if (ids.has(parent) && !ids.has(pid)) { ids.add(pid); changed = true; } }
      peak = Math.max(peak ?? 0, rows.filter(([pid]) => ids.has(pid)).reduce((sum, row) => sum + row[2], 0) / 1024);
    } catch { /* Unsupported process accounting is unavailable, not zero. */ } finally { sampling = false; }
  };
  const timer = setInterval(sample, 200);
  let code: number | null;
  try { code = await new Promise((done, reject) => { child.once('error', reject); child.once('close', done); }); }
  finally { clearInterval(timer); await stdout.close(); await stderr.close(); }
  const result = { code, wholeProcessMs: performance.now() - started, peakProcessTreeMiB: peak };
  await writeFile(join(out, `${label}.exit.json`), JSON.stringify(result, null, 2));
  if (code !== 0) throw new Error(`${label} failed; inspect ${join(out, `${label}.stderr.log`)}`);
  return result;
}

if (args.includes('--prepare-fframes')) {
  const checkout = resolve(value('--fframes-source'));
  if (!value('--fframes-source')) throw new Error('--fframes-source is required');
  const revision = (await execute('git', ['-C', checkout, 'rev-parse', 'HEAD'])).stdout.trim();
  if (revision !== PIN) throw new Error(`fframes checkout must be pinned to ${PIN}`);
  await execute('git', ['-C', checkout, 'diff', '--quiet', 'HEAD']);
  const source = await readFile(join(checkout, 'render-bench/vs-remotion/fframes/src/main.rs'), 'utf8');
  const start = source.indexOf('const NODES:'), end = source.indexOf('\nfn main()');
  if (start < 0 || end <= start) throw new Error('Unsupported upstream benchmark shape');
  const crate = join(out, 'fframes-cpu'); await mkdir(join(crate, 'src'), { recursive: true });
  await writeFile(join(crate, 'Cargo.toml'), `[package]\nname = "helios-fframes-cpu-comparison"\nversion = "0.1.0"\nedition = "2024"\n[workspace]\n[dependencies]\nfframes = { path = ${JSON.stringify(join(checkout, 'fframes'))}, features = ["h264", "libav-agree-gpl", "compile-time-svgtree"] }\n`);
  await writeFile(join(crate, 'src/main.rs'), `use std::time::Instant;
use std::io::Write;
use fframes::{AudioMap, Color, Duration, EncoderOptions, FFramesContext, Frame, MediaDirectory, RenderOptions, Svgr, Video, fframes_logger::FFramesLoggerVariant};
${source.slice(start, end)}
fn main() {
    let args: Vec<String> = std::env::args().collect();
    let output = args.get(1).expect("output path required");
    let preset = args.get(2).map(String::as_str).unwrap_or("medium");
    let crf = args.get(3).map(String::as_str).unwrap_or("18");
    let workers = args.get(4).map(|value| value.parse::<usize>().unwrap()).unwrap_or_else(|| std::thread::available_parallelism().unwrap().get());
    let encoder_threads = args.get(5).map(String::as_str).unwrap_or("0");
    let started = Instant::now();
    let media_dir = MediaDirectory::read_folder(${JSON.stringify(join(checkout, 'render-bench/vs-remotion/fframes/media'))}).unwrap();
    let media = media_dir.process_media_source().unwrap();
    let options = RenderOptions {
        media: Some(&media), load_system_fonts: false, default_font: "DM Sans", logger: FFramesLoggerVariant::Compact,
        video_encoder_options: EncoderOptions { preferred_encoder: Some("libx264"), codec_params: Some(&[("crf", crf), ("preset", preset), ("threads", encoder_threads)]), ..Default::default() }, ..Default::default()
    };
    let backend = fframes::cpu::CpuRenderingBackend { cache_capacity: 20, text_cache_capacity: 10, concurrency: workers };
    if output == "--raw-yuv" {
        let width = TextGrid::WIDTH;
        let height = TextGrid::HEIGHT;
        let area = width * height;
        // Upstream's scalar converter creates slices with padding beyond the
        // visible planes. Allocate that padding even on the SIMD platform.
        let padded = area + width;
        let mut y = vec![0u8; padded];
        let mut u = vec![0u8; padded / 2];
        let mut v = vec![0u8; padded / 2];
        let mut stdout = std::io::stdout().lock();
        for index in 0..300 {
            let rgba = fframes::render_frame(index, &TextGrid, backend, &options).expect("raw frame failed");
            unsafe { fframes::pix_fmt::fill_yuv420_from_rgba_pixmap_accelerated(width as i32, height as i32, width as i32, (width / 2) as i32, (width / 2) as i32, &rgba, y.as_mut_ptr(), u.as_mut_ptr(), v.as_mut_ptr()); }
            stdout.write_all(&y[..area]).unwrap();
            stdout.write_all(&u[..area / 4]).unwrap();
            stdout.write_all(&v[..area / 4]).unwrap();
        }
        return;
    }
    fframes::render(output, &TextGrid, backend, &options).expect("render failed");
    eprintln!("renderSeconds={:.6}", started.elapsed().as_secs_f64());
}
`);
  await run(value('--cargo', 'cargo'), ['build', '--release', '--manifest-path', join(crate, 'Cargo.toml'), '--target-dir', join(out, 'cargo-target')], 'fframes-build');
  console.log(`CPU-only fframes binary: ${join(out, 'cargo-target/release/helios-fframes-cpu-comparison')}`);
} else if (args.includes('--worker')) {
  const { renderCanvasModule } = await import('../dist/index.js');
  const preset = value('--preset') as 'medium' | 'ultrafast', started = performance.now();
  const result = await renderCanvasModule(join(out, 'textgrid.mjs'), value('--video'), { ...tools, concurrency: workers, chunkFrames: Math.ceil(TEXT_GRID.frames / workers), encoder: { preset, crf, threads: encoderThreads, gop: 24, bframes: preset === 'ultrafast' ? 0 : 3, sceneCut: preset !== 'ultrafast', qmin: 15, qmax: 60, qcompress: 0.6, maxQdiff: 4, colorConversion: conversion as 'rgb-bt601' | 'srgb-bt709' } });
  await writeFile(value('--result'), JSON.stringify({ ...result, deliveredMs: performance.now() - started }, null, 2));
} else {
  const binary = value('--fframes-bin'), font = value('--font');
  if (!binary || !font) throw new Error('--fframes-bin and --font are required; run --prepare-fframes first');
  const repeats = Number(value('--repeats', '5'));
  const roundStart = Number(value('--round-start', '0'));
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > 30) throw new Error('Invalid repeat count');
  if (!Number.isInteger(roundStart) || roundStart < 0 || roundStart + repeats > 30) throw new Error('Invalid round offset');
  if (!Number.isInteger(workers) || workers < 1 || workers > 64 || !Number.isInteger(encoderThreads) || encoderThreads < 1 || encoderThreads > 64) throw new Error('Invalid CPU budget');
  if (!Number.isInteger(fframesWorkers) || fframesWorkers < 1 || fframesWorkers > 64 || !Number.isInteger(fframesEncoderThreads) || fframesEncoderThreads < 0 || fframesEncoderThreads > 64) throw new Error('Invalid fframes CPU budget');
  const fontBytes = await readFile(font);
  if (createHash('sha256').update(fontBytes).digest('hex') !== FONT_SHA256) throw new Error('TextGrid requires the unchanged pinned upstream DM Sans font');
  await writeFile(join(out, 'textgrid.mjs'), `import {readFile} from 'node:fs/promises';\nimport {createTextGrid} from ${JSON.stringify(new URL('./fframes-textgrid.mjs', import.meta.url).href)};\nexport default async()=>createTextGrid(await readFile(${JSON.stringify(resolve(font))}));\n`);
  const results: any[] = [];
  const host = { platform: platform(), arch: arch(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, availableParallelism: availableParallelism(), memoryGiB: totalmem() / 1024 ** 3, node: process.version };
  const evidence = { pin: PIN, host, workload: TEXT_GRID, fontSha256: createHash('sha256').update(fontBytes).digest('hex'), tools, workers, encoderThreads, fframesWorkers, fframesEncoderThreads, conversion, crf, repeats, repairFframesEditList: args.includes('--repair-fframes-edit-list'), protocol: 'Interleaved fresh processes, sequential jobs, all 300 frames decoded for both engines; compilation excluded. Primary whole-process timer excludes verification for both, reported separately. Helios service time retains full final decode verification and packet checks on freshly encoded internal H.264 chunks. Skia versus tiny-skia glyph rasterization and averaged versus top-left chroma differ; this compares scene semantics, not identical pixels.', results };
  for (const preset of value('--presets', 'medium,ultrafast').split(',')) {
    if (!['medium', 'ultrafast'].includes(preset)) throw new Error('Unsupported preset');
    for (let round = roundStart; round < roundStart + repeats; round++) for (const engine of round % 2 ? ['helios', 'fframes'] : ['fframes', 'helios']) {
      const label = `${preset}-${round}-${engine}`, video = join(out, `${label}.mp4`), resultPath = join(out, `${label}.json`);
      console.log(`Running ${label}`);
      const processResult = engine === 'fframes' ? await run(binary, [video, preset, String(crf), String(fframesWorkers), String(fframesEncoderThreads)], label) : await run(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), ...args, '--worker', '--preset', preset, '--video', video, '--result', resultPath], label);
      // Explicitly selected workaround for upstream MP4 edit lists hiding the
      // last packet. Preserve the original and include the stream-copy cost.
      let editListRepairMs = 0;
      if (engine === 'fframes' && preset === 'ultrafast' && args.includes('--repair-fframes-edit-list')) {
        const original = join(out, `${label}-original.mp4`); await rename(video, original);
        const repair = await run(tools.ffmpeg, ['-v', 'error', '-y', '-ignore_editlist', '1', '-i', original, '-map', '0:v:0', '-c:v', 'copy', '-an', '-use_editlist', '0', video], `${label}-edit-list-repair`);
        editListRepairMs = repair.wholeProcessMs;
        processResult.wholeProcessMs += editListRepairMs;
      }
      const verifyStarted = performance.now(), info = await probeVideo(video, tools), externalVerifyMs = performance.now() - verifyStarted;
      if (info.frameCount !== TEXT_GRID.frames || info.width !== TEXT_GRID.width || info.height !== TEXT_GRID.height || info.fps.num / info.fps.den !== TEXT_GRID.fps || info.codec !== 'h264' || Math.abs(info.duration - TEXT_GRID.frames / TEXT_GRID.fps) > 1 / TEXT_GRID.fps) throw new Error(`${label} failed completeness; no speed claim is valid`);
      const details = engine === 'helios' ? JSON.parse(await readFile(resultPath, 'utf8')) : {};
      const encoding = await encoderInfo(video);
      const expected = { threads: engine === 'helios' ? encoderThreads : fframesEncoderThreads, bframes: preset === 'ultrafast' ? 0 : 3, keyint: 24, crf, qpmin: 15, qpmax: 60, qcomp: 0.6, qpstep: 4, scenecut: preset === 'ultrafast' ? 0 : 40 };
      for (const [key, wanted] of Object.entries(expected)) {
        if (key === 'threads' && wanted === 0) continue;
        if (encoding.parameters[key] !== wanted) throw new Error(`${label} has mismatched ${key}; no speed claim is valid`);
      }
      const diagnostics = engine === 'fframes' ? await readFile(join(out, `${label}.stderr.log`), 'utf8') : '';
      const renderMs = engine === 'fframes' ? Number(diagnostics.match(/renderSeconds=([0-9.]+)/)?.[1]) * 1000 : undefined;
      // A final decode check is included in Helios' API and performed here for fframes.
      // Report the complete measured service time as well as upstream render timing.
      const comparableProcessMs = processResult.wholeProcessMs - (details.finalVerifyMs ?? 0);
      const verifiedServiceMs = engine === 'helios' ? processResult.wholeProcessMs : processResult.wholeProcessMs + externalVerifyMs;
      const result = { engine, preset, round, video, ...processResult, editListRepairMs, comparableProcessMs, verifiedServiceMs, externalVerifyMs, verified: info, encoding, upstreamRenderMs: renderMs, details };
      results.push(result); await writeFile(join(out, 'results.json'), JSON.stringify(evidence, null, 2));
      console.log(JSON.stringify({ engine, preset, round, renderSeconds: comparableProcessMs / 1000, verifiedServiceSeconds: verifiedServiceMs / 1000, peakMiB: processResult.peakProcessTreeMiB, verifySeconds: externalVerifyMs / 1000, ranges: details.ranges }));
    }
  }
}
