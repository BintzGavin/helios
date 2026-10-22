import { SVGPathData } from 'svg-pathdata';
import { Plan, Node, evaluate, resolveLength, frameTime } from './plan.js';
import { layoutText, type TextLayout } from './text.js';
import type { PreparedScene } from './render.js';

/**
 * Problems a render does not stop on. Missing fonts and glyphs, a grapheme wider than its
 * box and unreadable assets already fail preparation, so they never reach this report.
 */
export type FindingCode = 'TEXT_OFF_CANVAS' | 'TEXT_CLIPPED' | 'TEXT_BOX_OVERFLOW' | 'EMPTY_FRAME';
export interface Finding {
  code: FindingCode; severity: 'warning' | 'info'; node?: string; message: string;
  /** Sampled frames that show the problem; the same node and code across frames is one finding. */
  frames: { first: number; last: number; count: number }; seconds: { first: number; last: number };
  /** For text on the canvas edge: its ink in canvas pixels at the first frame, to crop a frame to. */
  bounds?: Box;
}
export interface InspectReport { every: number; sampledFrames: number; findings: Finding[] }
type Matrix = [number, number, number, number, number, number];
export type Box = { minX: number; minY: number; maxX: number; maxY: number };

const multiply = (m: Matrix, n: Matrix): Matrix => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const translate = (x: number, y: number): Matrix => [1, 0, 0, 1, x, y];
/** Device bounds of a local box: every corner, since rotation moves the extremes. */
function project(m: Matrix, b: Box): Box {
  const xs: number[] = [], ys: number[] = [];
  for (const [x, y] of [[b.minX, b.minY], [b.maxX, b.minY], [b.minX, b.maxY], [b.maxX, b.maxY]]) { xs.push(m[0] * x + m[2] * y + m[4]); ys.push(m[1] * x + m[3] * y + m[5]); }
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
const round = (v: number) => Math.round(v * 10) / 10;
const snippet = (text: string) => JSON.stringify(text.length > 40 ? `${text.slice(0, 39)}…` : text);

/** The frames inspect looks at: one every `every` seconds, the last frame, each node's first and last frame and the frame after it ends. */
export function sampleFrames(plan: Plan, every = 0.25): number[] {
  const step = Math.max(1, Math.round(every * plan.fps.num / plan.fps.den)), frames = new Set<number>([plan.frameCount - 1]);
  for (let i = 0; i < plan.frameCount; i += step) frames.add(i);
  const visit = (nodes: Node[], start: number, end: number) => {
    for (const n of nodes) {
      const s = Math.max(start, n.start ?? 0), e = Math.min(end, n.end ?? plan.frameCount);
      if (e > s) { frames.add(s); frames.add(e - 1); if (e < plan.frameCount) frames.add(e); }
      if (n.children) visit(n.children, s, e);
    }
  };
  visit(plan.nodes, 0, plan.frameCount);
  return [...frames].sort((a, b) => a - b);
}

/**
 * Lays out sampled frames without rasterizing them and reports text that leaves the canvas,
 * wrapped text taller than its box and frames with nothing drawn. Text under a clip is
 * skipped: the clip decides what shows. Opacity 0 hides a subtree.
 */
export function inspectPlan(plan: Plan, prepared: PreparedScene, options: { every?: number } = {}): InspectReport {
  const every = options.every ?? 0.25, frames = sampleFrames(plan, every);
  const paths = new Map<string, Box>(), inks = new WeakMap<TextLayout, Box>();
  const found = new Map<string, Finding>();
  const report = (code: FindingCode, severity: Finding['severity'], index: number, message: string, node?: string, bounds?: Box) => {
    const key = `${code}:${node ?? ''}`, existing = found.get(key);
    if (existing) { existing.frames.last = index; existing.frames.count++; existing.seconds.last = frameTime(plan.fps, index); return; }
    const box = bounds && { minX: round(bounds.minX), minY: round(bounds.minY), maxX: round(bounds.maxX), maxY: round(bounds.maxY) };
    found.set(key, { code, severity, ...(node ? { node } : {}), message, frames: { first: index, last: index, count: 1 }, seconds: { first: frameTime(plan.fps, index), last: frameTime(plan.fps, index) }, ...(box ? { bounds: box } : {}) });
  };
  /** The ink of every glyph, in the text node's own coordinates (glyphs are drawn y-flipped). */
  const ink = (layout: TextLayout): Box | undefined => {
    let box = inks.get(layout);
    if (box) return box;
    box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const glyph of layout.paths) {
      let b = paths.get(glyph.d);
      if (!b) { b = glyph.d ? new SVGPathData(glyph.d).getBounds() : { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }; paths.set(glyph.d, b); }
      if (!Number.isFinite(b.minX)) continue;
      box.minX = Math.min(box.minX, glyph.x + b.minX * glyph.scale); box.maxX = Math.max(box.maxX, glyph.x + b.maxX * glyph.scale);
      box.minY = Math.min(box.minY, glyph.y - b.maxY * glyph.scale); box.maxY = Math.max(box.maxY, glyph.y - b.minY * glyph.scale);
    }
    inks.set(layout, box);
    return Number.isFinite(box.minX) ? box : undefined;
  };
  for (const index of frames) {
    let drawn = false;
    // Mirrors frameSvg: the same visibility, lengths, layout offsets and transform order.
    const visit = (n: Node, parent: Matrix, parentWidth: number, parentHeight: number, clipped: boolean, layoutX = 0, layoutY = 0) => {
      if (index < (n.start ?? 0) || index >= (n.end ?? plan.frameCount)) return;
      if (evaluate(n.opacity ?? 1, index) <= 0) return;
      const width = resolveLength(n.width, parentWidth, index, parentWidth), height = resolveLength(n.height, parentHeight, index, parentHeight);
      const x = resolveLength(n.x, parentWidth, index) + layoutX, y = resolveLength(n.y, parentHeight, index) + layoutY, t = n.transform;
      const ox = t?.originX ?? 0, oy = t?.originY ?? 0, angle = evaluate(t?.rotation ?? 0, index) * Math.PI / 180;
      const sx = evaluate(t?.scaleX ?? 1, index), sy = evaluate(t?.scaleY ?? 1, index);
      const local: Matrix = multiply(multiply(multiply(translate(x + ox, y + oy), [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0]), [sx, 0, 0, sy, 0, 0]), translate(-ox, -oy));
      const m = multiply(parent, local), clip = clipped || !!n.clip;
      if (n.type === 'group') {
        const l = n.layout, padding = l?.padding ?? 0, innerWidth = width - padding * 2, innerHeight = height - padding * 2;
        let cursor = padding;
        for (const child of n.children ?? []) {
          let cx = 0, cy = 0;
          if (l) {
            const cw = resolveLength(child.width, innerWidth, index, innerWidth), ch = resolveLength(child.height, innerHeight, index, innerHeight);
            const crossSpace = l.direction === 'row' ? innerHeight - ch : innerWidth - cw;
            const cross = padding + (l.align === 'center' ? crossSpace / 2 : l.align === 'end' ? crossSpace : 0);
            cx = l.direction === 'row' ? cursor : cross; cy = l.direction === 'column' ? cursor : cross;
            cursor += (l.direction === 'row' ? cw : ch) + (l.gap ?? 0);
          }
          visit(child, m, innerWidth, innerHeight, clip, cx, cy);
        }
        return;
      }
      if (sx === 0 || sy === 0) return;
      if (n.type !== 'text') { if (width > 0 && height > 0) drawn = true; return; }
      let layout = prepared.text.get(n.id);
      if (!layout || layout.width !== width) { layout = layoutText(n, width, prepared.fonts); prepared.text.set(n.id, layout); }
      const box = ink(layout);
      if (!box) return;
      drawn = true;
      if (n.height !== undefined && box.maxY > height + 1) {
        report('TEXT_BOX_OVERFLOW', 'warning', index, `Text ${snippet(n.text!)} wraps to ${layout.lines.length} lines and runs ${round(box.maxY - height)} px below its ${round(height)} px box; widen the box, shorten the text or lower fontSize`, n.id);
      }
      if (clip) return;
      const device = project(m, box);
      // One pixel of tolerance: antialiasing at the edge is not a cut.
      const outside = device.maxX <= 1 || device.maxY <= 1 || device.minX >= plan.width - 1 || device.minY >= plan.height - 1;
      const cut = device.minX < -1 || device.minY < -1 || device.maxX > plan.width + 1 || device.maxY > plan.height + 1;
      const where = `x ${round(device.minX)}..${round(device.maxX)}, y ${round(device.minY)}..${round(device.maxY)} on a ${plan.width}x${plan.height} canvas`;
      if (outside) report('TEXT_OFF_CANVAS', 'warning', index, `Text ${snippet(n.text!)} is drawn entirely outside the canvas (${where})`, n.id, device);
      else if (cut) report('TEXT_CLIPPED', 'warning', index, `Text ${snippet(n.text!)} is cut off by the canvas edge (${where})`, n.id, device);
    };
    for (const node of plan.nodes) visit(node, [1, 0, 0, 1, 0, 0], plan.width, plan.height, false);
    if (!drawn) report('EMPTY_FRAME', 'info', index, 'Only the background is visible: no node is drawn at this frame');
  }
  const findings = [...found.values()].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'warning' ? -1 : 1) || a.frames.first - b.frames.first);
  return { every, sampledFrames: frames.length, findings };
}
