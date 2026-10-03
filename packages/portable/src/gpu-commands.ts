import { RenderError } from './plan.js';

export type Color = [number, number, number, number];
export interface GpuCommand { op: string; args?: number[]; matrix?: number[]; color?: Color; text?: string; font?: string; size?: number }
export const GPU_LIMITS = Object.freeze({ commands: 120000, frameBytes: 32 * 1024 * 1024, fontHeaderBytes: 48 * 1024 * 1024, stack: 64 });
export const resourceLimit = (): never => { throw new RenderError('GPU_RESOURCE_LIMIT', 'GPU command, text, font or message budget exceeded'); };

export interface CommandSink {
  rect(x: number, y: number, width: number, height: number, color: Color): void;
  circle(x: number, y: number, radius: number, matrix: number[], color: Color): void;
  text(text: string, x: number, y: number, font: string, size: number, color: Color): void;
  transform(op: 'translate' | 'scale' | 'rotate', x: number, y?: number): void;
  stack(op: 'save' | 'restore'): void;
}

export class JsonCommands implements CommandSink {
  readonly commands: GpuCommand[] = [];
  private push(command: GpuCommand) { if (this.commands.length >= GPU_LIMITS.commands) resourceLimit(); this.commands.push(command); }
  rect(x: number, y: number, width: number, height: number, color: Color) { this.push({ op: 'rect', args: [x, y, width, height], color: [...color] }); }
  circle(x: number, y: number, radius: number, matrix: number[], color: Color) { this.push({ op: 'circle', args: [x, y, radius], matrix: [...matrix], color: [...color] }); }
  text(text: string, x: number, y: number, font: string, size: number, color: Color) { this.push({ op: 'text', text, args: [x, y], font, size, color: [...color] }); }
  transform(op: 'translate' | 'scale' | 'rotate', x: number, y?: number) { this.push({ op, args: y === undefined ? [x] : [x, y] }); }
  stack(op: 'save' | 'restore') { this.push({ op }); }
}

/** Little-endian, four-byte aligned protocol5; command storage has no object tree. */
export class BinaryCommands implements CommandSink {
  private buffer: Buffer;
  private words!: Uint32Array;
  private floats!: Float32Array;
  private offset = 8;
  private count = 0;
  constructor(initialBytes = 1024) {
    this.buffer = Buffer.allocUnsafeSlow(Math.max(32, Math.min(GPU_LIMITS.frameBytes, Math.ceil(initialBytes / 4) * 4)));
    this.views(); this.words[0] = 0x35464748; this.words[3] = 0;
  }
  private views() { this.words = new Uint32Array(this.buffer.buffer, this.buffer.byteOffset, this.buffer.length / 4); this.floats = new Float32Array(this.buffer.buffer, this.buffer.byteOffset, this.buffer.length / 4); }
  private reserve(words: number, tag: number): number {
    const next = this.offset + words;
    if (this.count >= GPU_LIMITS.commands || next * 4 > GPU_LIMITS.frameBytes) resourceLimit();
    if (next > this.words.length) {
      const buffer = Buffer.allocUnsafeSlow(Math.min(GPU_LIMITS.frameBytes, Math.max(next * 4, this.buffer.length * 2)));
      this.buffer.copy(buffer, 0, 0, this.offset * 4); this.buffer = buffer; this.views();
    }
    const start = this.offset; this.offset = next; this.count++; this.words[start] = tag; return start;
  }
  rect(x: number, y: number, width: number, height: number, color: Color) {
    const i = this.reserve(9, 1); this.floats[i + 1] = x; this.floats[i + 2] = y; this.floats[i + 3] = width; this.floats[i + 4] = height; this.floats.set(color, i + 5);
  }
  circle(x: number, y: number, radius: number, matrix: number[], color: Color) {
    const i = this.reserve(14, 2); this.floats[i + 1] = x; this.floats[i + 2] = y; this.floats[i + 3] = radius; this.floats.set(matrix, i + 4); this.floats.set(color, i + 10);
  }
  text(text: string, x: number, y: number, font: string, size: number, color: Color) {
    const fontBytes = Buffer.byteLength(font), textBytes = Buffer.byteLength(text);
    const fontWords = Math.ceil(fontBytes / 4), textWords = Math.ceil(textBytes / 4);
    const i = this.reserve(10 + fontWords + textWords, 8);
    this.floats[i + 1] = x; this.floats[i + 2] = y; this.floats[i + 3] = size; this.floats.set(color, i + 4);
    this.words[i + 8] = fontBytes; this.words[i + 9] = textBytes;
    const start = (i + 10) * 4, middle = start + fontWords * 4, end = middle + textWords * 4;
    this.buffer.fill(0, start, end); this.buffer.write(font, start, fontBytes, 'utf8'); this.buffer.write(text, middle, textBytes, 'utf8');
  }
  transform(op: 'translate' | 'scale' | 'rotate', x: number, y?: number) {
    const i = this.reserve(op === 'rotate' ? 2 : 3, op === 'translate' ? 3 : op === 'scale' ? 4 : 5);
    this.floats[i + 1] = x; if (op !== 'rotate') this.floats[i + 2] = y!;
  }
  stack(op: 'save' | 'restore') { this.reserve(1, op === 'save' ? 6 : 7); }
  finish(background: Color): Buffer {
    this.words[1] = this.offset * 4; this.words[2] = this.count; this.floats.set(background, 4);
    return this.buffer.subarray(0, this.offset * 4);
  }
}
