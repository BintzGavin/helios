import { z } from 'zod';
import { SVGPathData } from 'svg-pathdata';

export const PROFILE = 'portable-v1' as const;
export const LIMITS = Object.freeze({ nodes: 2000, keys: 5000, depth: 16, imagePixels: 16_000_000, decodedImagePixels: 32_000_000, assetBytes: 256 * 1024 * 1024, totalAssetBytes: 256 * 1024 * 1024, fontBytes: 32 * 1024 * 1024, textCharacters: 20000, assets: 256, inputBytes: 2 * 1024 * 1024 });
export type Fps = { num: number; den: number };
export type Scalar = number | { keyframes: { frame: number; value: number; easing?: 'linear' | 'hold' | 'ease-in' | 'ease-out' | 'ease-in-out' }[] };
export type Length = Scalar | `${number}%`;
export type Paint = string | { type: 'linear'; x1: number; y1: number; x2: number; y2: number; stops: { offset: number; color: string }[] };
export type Clip = { type: 'rect'; width: number; height: number; radius?: number } | { type: 'path'; d: string };
export interface Node {
  id: string; type: 'rect' | 'ellipse' | 'path' | 'group' | 'text' | 'image' | 'video';
  x?: Length; y?: Length; width?: Length; height?: Length; opacity?: Scalar;
  start?: number; end?: number;
  transform?: { scaleX?: Scalar; scaleY?: Scalar; rotation?: Scalar; originX?: number; originY?: number };
  clip?: Clip; fill?: Paint; stroke?: { color: string; width: number }; radius?: number; d?: string;
  children?: Node[]; layout?: { direction: 'row' | 'column'; gap?: number; padding?: number; align?: 'start' | 'center' | 'end' };
  text?: string; fonts?: string[]; fontSize?: number; lineHeight?: number; align?: 'left' | 'center' | 'right'; direction?: 'auto' | 'ltr' | 'rtl';
  asset?: string; fit?: 'cover' | 'contain' | 'fill'; sourceStart?: number;
}
export interface Asset { sha256: string; bytes: number; type: 'image' | 'font' | 'video' | 'audio' }
export interface AudioTrack { asset: string; start: number; end: number; sourceStart: number; gain: number; fadeIn: number; fadeOut: number }
export interface Plan { version: typeof PROFILE; width: number; height: number; fps: Fps; frameCount: number; background: string; assets: Record<string, Asset>; nodes: Node[]; audio: AudioTrack[] }

export class RenderError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); this.name = 'RenderError'; }
}
const number = z.number().finite().min(-1e7).max(1e7);
const positive = number.positive();
const frame = z.number().int().min(0).max(18000);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/);
const scalar = z.union([number, z.object({ keyframes: z.array(z.object({ frame, value: number, easing: z.enum(['linear', 'hold', 'ease-in', 'ease-out', 'ease-in-out']).optional() }).strict()).min(1).max(LIMITS.keys) }).strict()]);
const length = z.union([scalar, z.string().regex(/^(?:\d{1,3}(?:\.\d+)?)%$/)]);
const paint = z.union([color, z.object({ type: z.literal('linear'), x1: number, y1: number, x2: number, y2: number, stops: z.array(z.object({ offset: z.number().min(0).max(1), color }).strict()).min(2).max(32) }).strict()]);
const clip = z.union([z.object({ type: z.literal('rect'), width: positive, height: positive, radius: number.nonnegative().optional() }).strict(), z.object({ type: z.literal('path'), d: z.string().min(1).max(50000).regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]+$/) }).strict()]);
const base = {
  id, x: length.optional(), y: length.optional(), width: length.optional(), height: length.optional(), opacity: scalar.optional(), start: frame.optional(), end: frame.optional(), clip: clip.optional(),
  transform: z.object({ scaleX: scalar.optional(), scaleY: scalar.optional(), rotation: scalar.optional(), originX: number.optional(), originY: number.optional() }).strict().optional(),
};
const shape = { fill: paint.optional(), stroke: z.object({ color, width: number.nonnegative() }).strict().optional() };
const nodeSchema: z.ZodType<Node> = z.lazy(() => z.discriminatedUnion('type', [
  z.object({ ...base, ...shape, type: z.literal('rect'), width: length, height: length, radius: number.nonnegative().optional() }).strict(),
  z.object({ ...base, ...shape, type: z.literal('ellipse'), width: length, height: length }).strict(),
  z.object({ ...base, ...shape, type: z.literal('path'), d: z.string().min(1).max(50000).regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\s-]+$/) }).strict(),
  z.object({ ...base, type: z.literal('group'), children: z.array(nodeSchema).max(LIMITS.nodes), layout: z.object({ direction: z.enum(['row', 'column']), gap: number.nonnegative().optional(), padding: number.nonnegative().optional(), align: z.enum(['start', 'center', 'end']).optional() }).strict().optional() }).strict(),
  z.object({ ...base, type: z.literal('text'), text: z.string().max(20000), fonts: z.array(id).min(1).max(16), fontSize: positive.max(1000), lineHeight: positive.max(3000).optional(), align: z.enum(['left', 'center', 'right']).optional(), direction: z.enum(['auto', 'ltr', 'rtl']).optional(), fill: color.optional() }).strict(),
  z.object({ ...base, type: z.literal('image'), asset: id, width: length, height: length, fit: z.enum(['cover', 'contain', 'fill']).optional() }).strict(),
  z.object({ ...base, type: z.literal('video'), asset: id, width: length, height: length, fit: z.enum(['cover', 'contain', 'fill']).optional(), sourceStart: number.nonnegative().optional() }).strict(),
]) as z.ZodType<Node>);
const schema = z.object({
  version: z.literal(PROFILE), width: z.number().int().min(2).max(1920), height: z.number().int().min(2).max(1920),
  fps: z.object({ num: z.number().int().positive().max(30000), den: z.number().int().positive().max(1001) }).strict(), frameCount: frame.positive(),
  background: color.default('#000000'),
  assets: z.record(id, z.object({ sha256: z.string().regex(/^[0-9a-f]{64}$/), bytes: z.number().int().positive().max(LIMITS.assetBytes), type: z.enum(['image', 'font', 'video', 'audio']) }).strict()).default({}),
  nodes: z.array(nodeSchema).max(LIMITS.nodes),
  audio: z.array(z.object({ asset: id, start: frame.default(0), end: frame, sourceStart: number.nonnegative().default(0), gain: z.number().min(0).max(16).default(1), fadeIn: number.nonnegative().default(0), fadeOut: number.nonnegative().default(0) }).strict()).max(64).default([]),
}).strict();

function inspectData(value: unknown, seen = new WeakSet<object>(), depth = 0): void {
  if (depth > 64) throw new RenderError('INVALID_PLAN', 'Input nesting exceeds its limit');
  if (typeof value === 'function' || typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'undefined') throw new RenderError('INVALID_PLAN', 'Only JSON data is accepted');
  if (value && typeof value === 'object') {
    if (seen.has(value)) throw new RenderError('INVALID_PLAN', 'Cyclic input is not accepted');
    if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new RenderError('INVALID_PLAN', 'Only plain JSON objects are accepted');
    seen.add(value);
    for (const child of Object.values(value)) inspectData(child, seen, depth + 1);
    seen.delete(value);
  }
}
export function parsePlan(input: unknown): Plan {
  inspectData(input);
  if (new TextEncoder().encode(JSON.stringify(input)).length > LIMITS.inputBytes) throw new RenderError('INVALID_PLAN', 'Plan exceeds 2 MiB');
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new RenderError('INVALID_PLAN', `${issue.path.join('.') || 'plan'}: ${issue.message}`);
  }
  const plan = result.data as Plan;
  const fail = (message: string): never => { throw new RenderError('INVALID_PLAN', message); };
  const fps = plan.fps.num / plan.fps.den;
  if (![[24, 1], [25, 1], [30, 1], [30000, 1001]].some(([n, d]) => n === plan.fps.num && d === plan.fps.den)) fail('fps: unsupported cadence');
  if (plan.width % 2 || plan.height % 2 || plan.width * plan.height > 1920 * 1080) fail('dimensions: require even dimensions up to 1080p');
  if (plan.frameCount / fps > 600) fail('frameCount: maximum duration is ten minutes');
  if (!/^#[0-9a-f]{6}(ff)?$/i.test(plan.background)) fail('background: final export must be opaque');
  if (Object.keys(plan.assets).length > LIMITS.assets) fail('assets: too many assets');
  if (Object.values(plan.assets).reduce((sum, asset) => sum + asset.bytes, 0) > LIMITS.totalAssetBytes) fail('assets: aggregate byte budget exceeded');
  if (Object.values(plan.assets).filter(a => a.type === 'font').reduce((sum, asset) => sum + asset.bytes, 0) > LIMITS.fontBytes) fail('assets: aggregate font byte budget exceeded');
  let count = 0, keys = 0, characters = 0;
  const ids = new Set<string>();
  const intervals: { start: number; end: number; type: 'video' | 'audio' }[] = [];
  const reference = (name: string, type: Asset['type']) => { if (plan.assets[name]?.type !== type) fail(`asset ${name}: expected declared ${type} asset`); };
  const checkScalar = (s: Length | undefined, label: string) => {
    if (typeof s === 'object') {
      keys += s.keyframes.length;
      let previous = -1;
      for (const key of s.keyframes) { if (key.frame <= previous || key.frame >= plan.frameCount) fail(`${label}: keyframes must increase within the timeline`); previous = key.frame; }
    }
  };
  const visit = (nodes: Node[], depth: number, parentStart: number, parentEnd: number) => {
    if (depth > LIMITS.depth) fail('nodes: nesting exceeds 16 groups');
    for (const n of nodes) {
      count++;
      if (ids.has(n.id)) fail(`nodes: duplicate id ${n.id}`);
      ids.add(n.id);
      for (const path of [n.d, n.clip?.type === 'path' ? n.clip.d : undefined]) if (path) {
        try {
          const commands = new SVGPathData(path).commands;
          if (!commands.length || commands[0].type !== SVGPathData.MOVE_TO || commands.some(c => Object.values(c).some(v => typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v) > 1e7)))) fail(`nodes.${n.id}: invalid path`);
        } catch { fail(`nodes.${n.id}: invalid path`); }
      }
      const start = n.start ?? 0, end = n.end ?? plan.frameCount;
      if (start >= end || end > plan.frameCount) fail(`nodes.${n.id}: invalid active range`);
      for (const [key, value] of Object.entries({ x: n.x, y: n.y, width: n.width, height: n.height, opacity: n.opacity, ...n.transform })) checkScalar(value, `nodes.${n.id}.${key}`);
      for (const property of ['width', 'height'] as const) {
        const value = n[property];
        if (typeof value === 'number' && value <= 0) fail(`nodes.${n.id}.${property}: must be positive`);
        if (typeof value === 'string' && parseFloat(value) <= 0) fail(`nodes.${n.id}.${property}: percentage must be positive`);
        if (typeof value === 'object' && value.keyframes.some(k => k.value <= 0)) fail(`nodes.${n.id}.${property}: all sizes must be positive`);
      }
      const opacities = typeof n.opacity === 'object' ? n.opacity.keyframes.map(k => k.value) : [n.opacity ?? 1];
      if (opacities.some(x => x < 0 || x > 1)) fail(`nodes.${n.id}.opacity: must be within 0..1`);
      if (n.type === 'text') { characters += n.text!.length; for (const font of n.fonts!) reference(font, 'font'); }
      if (n.type === 'image' || n.type === 'video') reference(n.asset!, n.type);
      const visibleStart = Math.max(start, parentStart), visibleEnd = Math.min(end, parentEnd);
      if (n.type === 'video' && visibleEnd > visibleStart) intervals.push({ start: visibleStart, end: visibleEnd, type: 'video' });
      if (n.children) visit(n.children, depth + 1, visibleStart, visibleEnd);
      if (typeof n.fill === 'object' && n.fill.stops.some((s, i, a) => i > 0 && s.offset < a[i - 1].offset)) fail(`nodes.${n.id}.fill: gradient stops must be ordered`);
    }
  };
  visit(plan.nodes, 1, 0, plan.frameCount);
  for (const track of plan.audio) {
    reference(track.asset, 'audio');
    if (track.start >= track.end || track.end > plan.frameCount) fail('audio: invalid active range');
    intervals.push({ start: track.start, end: track.end, type: 'audio' });
  }
  for (const type of ['audio', 'video'] as const) {
    const events = intervals.filter(i => i.type === type).flatMap(i => [{ frame: i.start, delta: 1 }, { frame: i.end, delta: -1 }]).sort((a, b) => a.frame - b.frame || a.delta - b.delta);
    let active = 0;
    for (const e of events) { active += e.delta; if (active > (type === 'audio' ? 4 : 2)) fail(`${type}: too many simultaneously active layers`); }
  }
  if (count > LIMITS.nodes || keys > LIMITS.keys) fail('nodes: resource envelope exceeded');
  if (characters > LIMITS.textCharacters) fail('text: aggregate character budget exceeded');
  return plan;
}
export function evaluate(s: Scalar, frameIndex: number): number {
  if (typeof s === 'number') return s;
  const keys = s.keyframes;
  if (frameIndex <= keys[0].frame) return keys[0].value;
  for (let i = 1; i < keys.length; i++) {
    if (frameIndex < keys[i].frame) {
      const a = keys[i - 1], b = keys[i];
      let t = (frameIndex - a.frame) / (b.frame - a.frame);
      switch (a.easing) {
        case 'hold': t = 0; break;
        case 'ease-in': t *= t; break;
        case 'ease-out': t = 1 - (1 - t) ** 2; break;
        case 'ease-in-out': t = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; break;
      }
      return a.value + (b.value - a.value) * t;
    }
  }
  return keys[keys.length - 1].value;
}
export const frameTime = (fps: Fps, index: number): number => index * fps.den / fps.num;
export const sampleCount = (fps: Fps, frames: number): number => Math.floor((frames * fps.den * 48000 * 2 + fps.num) / (2 * fps.num));
export const resolveLength = (value: Length | undefined, parent: number, frameIndex: number, fallback = 0): number => typeof value === 'string' ? parseFloat(value) * parent / 100 : value === undefined ? fallback : evaluate(value, frameIndex);
