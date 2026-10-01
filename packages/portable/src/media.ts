import { open, stat, rm } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { Plan, Node, Fps, RenderError, LIMITS, frameTime, sampleCount } from './plan.js';
import { runProcess, startProcess } from './process.js';

export interface MediaTools { ffmpeg?: string; ffprobe?: string; signal?: AbortSignal }
export interface VideoInfo { width: number; height: number; fps: Fps; duration: number }
export async function videoInfo(path: string, tools: MediaTools = {}, checkCadence = false): Promise<VideoInfo> {
  const file = await open(path, 'r');
  const header = Buffer.alloc(12);
  try { await file.read(header, 0, 12, 0); } finally { await file.close(); }
  if (header.toString('ascii', 4, 8) !== 'ftyp') throw new RenderError('INVALID_ASSET', 'Prepared video must be an MP4 file');
  const bytes = await runProcess(tools.ffprobe ?? 'ffprobe', ['-v', 'error', '-threads', '1', '-protocol_whitelist', 'file,pipe', '-show_streams', '-show_format', '-of', 'json', path], { signal: tools.signal, timeoutMs: 30000 });
  const info = JSON.parse(bytes.toString()), video = info.streams.find((s: any) => s.codec_type === 'video');
  if (!video || video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p') throw new RenderError('UNSUPPORTED_MEDIA', 'Prepare video as MP4/H.264 8-bit YUV420');
  if (video.width * video.height > LIMITS.imagePixels || !video.width || !video.height) throw new RenderError('RESOURCE_LIMIT', 'Decoded video dimensions exceed the pixel limit');
  if (video.tags?.rotate || video.side_data_list?.some((s: any) => s.rotation && s.rotation !== 0)) throw new RenderError('UNSUPPORTED_MEDIA', 'Normalize video rotation before submission');
  if (video.color_transfer && !['bt709', 'unknown'].includes(video.color_transfer)) throw new RenderError('UNSUPPORTED_MEDIA', 'Normalize video to SDR BT.709 before submission');
  const [num, den] = video.avg_frame_rate.split('/').map(Number);
  if (!num || !den || num / den > 120 || video.avg_frame_rate !== video.r_frame_rate || Number(video.start_time ?? 0) !== 0) throw new RenderError('UNSUPPORTED_MEDIA', 'Normalize video to a zero-based constant frame rate');
  if (checkCadence) {
    const timestamps = (await runProcess(tools.ffprobe ?? 'ffprobe', ['-v', 'error', '-threads', '1', '-protocol_whitelist', 'file,pipe', '-select_streams', 'v:0', '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'csv=p=0', path], { signal: tools.signal, timeoutMs: 300000, maxBytes: 8 * 1024 * 1024 })).toString().split('\n').map(s => Number.parseFloat(s)).filter(Number.isFinite);
    for (let i = 0; i < timestamps.length; i++) if (Math.abs(timestamps[i] - i * den / num) > 0.00001) throw new RenderError('UNSUPPORTED_MEDIA', 'Variable-frame-rate media requires normalization');
  }
  return { width: video.width, height: video.height, fps: { num, den }, duration: Number(video.duration ?? info.format.duration) };
}
export interface WavInfo { offset: number; frames: number; channels: number; bytesPerSample: number; format: number }
async function readAt(file: FileHandle, offset: number, bytes: number): Promise<Buffer> {
  const buffer = Buffer.alloc(bytes); let read = 0;
  while (read < bytes) { const result = await file.read(buffer, read, bytes - read, offset + read); if (!result.bytesRead) throw new RenderError('INVALID_ASSET', 'Truncated media data'); read += result.bytesRead; }
  return buffer;
}
export async function wavInfo(path: string): Promise<WavInfo> {
  const file = await open(path, 'r');
  try {
    const size = (await file.stat()).size, header = await readAt(file, 0, 12);
    if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') throw new RenderError('UNSUPPORTED_MEDIA', 'Prepare audio as a 48 kHz PCM WAV');
    let offset = 12, format = 0, channels = 0, bytesPerSample = 0, sampleRate = 0, dataOffset = 0, dataSize = 0;
    while (offset + 8 <= size) {
      const chunk = await readAt(file, offset, 8), length = chunk.readUInt32LE(4), name = chunk.toString('ascii', 0, 4);
      if (offset + 8 + length > size) throw new RenderError('INVALID_ASSET', 'WAV chunk exceeds the file');
      if (name === 'fmt ') {
        if (length < 16 || length > 4096) throw new RenderError('INVALID_ASSET', 'Invalid WAV format header');
        const fmt = await readAt(file, offset + 8, length);
        format = fmt.readUInt16LE(0); channels = fmt.readUInt16LE(2); sampleRate = fmt.readUInt32LE(4); bytesPerSample = fmt.readUInt16LE(14) / 8;
        if (format === 65534 && length >= 40) format = fmt.readUInt16LE(24);
      }
      if (name === 'data') { dataOffset = offset + 8; dataSize = length; }
      offset += 8 + length + length % 2;
    }
    if (![1, 2].includes(channels) || sampleRate !== 48000 || !((format === 1 && [2, 3, 4].includes(bytesPerSample)) || (format === 3 && bytesPerSample === 4))) throw new RenderError('UNSUPPORTED_MEDIA', 'Expected 48 kHz mono/stereo PCM WAV, 16/24/32-bit integer or float32');
    if (!dataOffset || !dataSize || dataSize % (channels * bytesPerSample)) throw new RenderError('INVALID_ASSET', 'WAV has an invalid sample count');
    return { offset: dataOffset, frames: dataSize / channels / bytesPerSample, channels, bytesPerSample, format };
  } finally { await file.close(); }
}
export async function mixAudio(plan: Plan, paths: Map<string, string>, output: string, signal?: AbortSignal): Promise<void> {
  const tracks = [];
  for (const track of plan.audio) {
    const path = paths.get(track.asset); if (!path) throw new RenderError('MISSING_ASSET', 'Audio asset is missing');
    const info = await wavInfo(path);
    const sourceStart = Math.round(track.sourceStart * 48000), start = sampleCount(plan.fps, track.start), end = sampleCount(plan.fps, track.end);
    if (sourceStart + end - start > info.frames) throw new RenderError('MEDIA_RANGE', 'Audio trim exceeds its prepared source');
    tracks.push({ track, info, path, sourceStart, start, end });
  }
  const destination = await open(output, 'w', 0o600), total = sampleCount(plan.fps, plan.frameCount);
  try {
    for (let offset = 0; offset < total; offset += 4096) {
      signal?.throwIfAborted();
      const count = Math.min(4096, total - offset), mixed = new Float64Array(count * 2);
      for (const { track, info, path, sourceStart, start, end } of tracks) {
        const from = Math.max(offset, start), to = Math.min(offset + count, end);
        if (to <= from) continue;
        const file = await open(path, 'r');
        let bytes: Buffer;
        try { bytes = await readAt(file, info.offset + (sourceStart + from - start) * info.channels * info.bytesPerSample, (to - from) * info.channels * info.bytesPerSample); } finally { await file.close(); }
        for (let i = from; i < to; i++) {
          const fadeIn = track.fadeIn ? Math.min(1, (i - start) / (track.fadeIn * 48000)) : 1;
          const fadeOut = track.fadeOut ? Math.min(1, (end - 1 - i) / (track.fadeOut * 48000)) : 1;
          for (let channel = 0; channel < 2; channel++) {
            const index = ((i - from) * info.channels + Math.min(channel, info.channels - 1)) * info.bytesPerSample;
            const sample = info.format === 3 ? bytes.readFloatLE(index) : bytes.readIntLE(index, info.bytesPerSample) / 2 ** (info.bytesPerSample * 8 - 1);
            if (!Number.isFinite(sample)) throw new RenderError('INVALID_ASSET', 'PCM audio contains a non-finite sample');
            mixed[(i - offset) * 2 + channel] += sample * track.gain * fadeIn * fadeOut;
          }
        }
      }
      const bytes = Buffer.alloc(count * 2 * 4);
      for (let i = 0; i < mixed.length; i++) bytes.writeFloatLE(Math.max(-1, Math.min(1, mixed[i])), i * 4);
      await destination.writeFile(bytes);
    }
  } finally { await destination.close(); }
}
export async function muxAudio(plan: Plan, paths: Map<string, string>, video: string, output: string, tools: MediaTools = {}): Promise<void> {
  const pcm = `${output}.pcm`;
  try {
    await mixAudio(plan, paths, pcm, tools.signal);
    await runProcess(tools.ffmpeg ?? 'ffmpeg', ['-v', 'error', '-y', '-i', video, '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', pcm, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-video_track_timescale', String(plan.fps.num), '-movflags', '+faststart', output], { signal: tools.signal, timeoutMs: 300000 });
  } finally { await rm(pcm, { force: true }); }
}

class StreamReader {
  private pending = Buffer.alloc(0);
  private iterator: AsyncIterator<Uint8Array>;
  constructor(stream: AsyncIterable<Uint8Array>) { this.iterator = stream[Symbol.asyncIterator](); }
  async read(length: number): Promise<Buffer> {
    const chunks: Buffer[] = []; let remaining = length;
    while (remaining) {
      if (!this.pending.length) { const next = await this.iterator.next(); if (next.done) throw new RenderError('MEDIA_RANGE', 'Video decoder ended before the requested frame'); this.pending = Buffer.from(next.value); }
      const count = Math.min(remaining, this.pending.length); chunks.push(this.pending.subarray(0, count)); this.pending = this.pending.subarray(count); remaining -= count;
    }
    return Buffer.concat(chunks, length);
  }
}
export class VideoDecoder {
  private process: ReturnType<typeof startProcess>;
  private reader: StreamReader;
  private next: number;
  private cached?: { index: number; png: Buffer };
  private rawBytes: number;
  constructor(path: string, sourceIndex: number, info: VideoInfo, tools: MediaTools & { format?: 'png' | 'rgba' }) {
    this.next = sourceIndex;
    this.rawBytes = tools.format === 'rgba' ? info.width * info.height * 4 : 0;
    this.process = startProcess(tools.ffmpeg ?? 'ffmpeg', ['-v', 'error', '-threads', '1', '-filter_threads', '1', '-protocol_whitelist', 'file,pipe', '-ss', frameTime(info.fps, sourceIndex).toFixed(9), '-i', path, '-an', '-vf', 'colorspace=iall=bt709:all=bt709:trc=srgb:range=pc:format=yuv444p,scale=in_color_matrix=bt709:in_range=pc', '-fps_mode', 'passthrough', ...(this.rawBytes ? ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-c:v', 'rawvideo', '-threads', '1'] : ['-f', 'image2pipe', '-c:v', 'png', '-threads', '1', '-compression_level', '1']), 'pipe:1'], { signal: tools.signal, timeoutMs: 300000 });
    this.process.child.stdin.end(); this.reader = new StreamReader(this.process.child.stdout);
  }
  async frame(index: number): Promise<Buffer> {
    if (this.cached?.index === index) return this.cached.png;
    if (index < this.next) throw new RenderError('INVALID_SEEK', 'A decoder session only advances; open a new session for random access');
    while (this.next <= index) {
      if (this.rawBytes) { this.cached = { index: this.next++, png: await this.reader.read(this.rawBytes) }; continue; }
      const signature = await this.reader.read(8);
      if (!signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new RenderError('INVALID_MEDIA', 'Decoder did not produce PNG frames');
      const chunks = [signature]; let size = 8;
      for (;;) {
        const header = await this.reader.read(8), length = header.readUInt32BE(0);
        size += length + 12;
        if (size > LIMITS.imagePixels * 5) throw new RenderError('RESOURCE_LIMIT', 'Decoded frame exceeded its buffer limit');
        chunks.push(header, await this.reader.read(length + 4));
        if (header.toString('ascii', 4, 8) === 'IEND') break;
      }
      this.cached = { index: this.next++, png: Buffer.concat(chunks, size) };
    }
    return this.cached!.png;
  }
  async close(): Promise<void> { this.process.kill(); this.process.child.stdout.destroy(); await this.process.done.catch(() => {}); }
}
export function activeVideos(plan: Plan, frame: number): Node[] {
  const output: Node[] = [];
  const visit = (nodes: Node[]) => { for (const node of nodes) { if (frame < (node.start ?? 0) || frame >= (node.end ?? plan.frameCount)) continue; if (node.type === 'video') output.push(node); if (node.children) visit(node.children); } };
  visit(plan.nodes); return output;
}
