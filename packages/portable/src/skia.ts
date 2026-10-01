import { createCanvas, loadImage, Path2D, ImageData, type Canvas, type Image, type SKRSContext2D } from './skia-binding.js';
import { Plan, Node, Paint, evaluate, resolveLength, RenderError } from './plan.js';
import { layoutText, type TextLayout } from './text.js';
import type { PreparedScene } from './render.js';

/** Retained CPU Skia surfaces: no browser, DOM, system fonts or executable input. */
export class SkiaRasterizer {
  private canvas: Canvas;
  private images = new Map<string, Image>();
  private video = new Map<string, Canvas>();
  private paths = new Map<string, Path2D>();
  private text = new Map<string, { layout: TextLayout; glyphs: { path: Path2D; x: number; y: number; scale: number }[]; bounds: number[] }>();
  private layers: Canvas[] = [];
  private textLayers: Canvas[] = [];
  private geometry = new Map<string, { key: string; path: Path2D }>();
  private prefix?: Canvas;
  private prefixCount = 0;
  constructor(private plan: Plan, private prepared: PreparedScene) {
    this.canvas = createCanvas(plan.width, plan.height);
    const fixed = (node: Node): boolean => node.type !== 'video' && (node.start ?? 0) === 0 && (node.end ?? plan.frameCount) === plan.frameCount &&
      !Object.values({ x: node.x, y: node.y, width: node.width, height: node.height, opacity: node.opacity, ...node.transform }).some(value => value && typeof value === 'object') &&
      (node.children ?? []).every(fixed);
    while (this.prefixCount < plan.nodes.length && fixed(plan.nodes[this.prefixCount])) this.prefixCount++;
  }
  async prepare(): Promise<void> {
    for (const [id, bytes] of this.prepared.images) this.images.set(id, await loadImage(bytes));
  }
  setVideo(id: string, rgba: Buffer, width: number, height: number): void {
    if (rgba.length !== width * height * 4) throw new RenderError('INVALID_MEDIA', 'Raw video frame size differs from its dimensions');
    let canvas = this.video.get(id);
    if (!canvas || canvas.width !== width || canvas.height !== height) { canvas = createCanvas(width, height); this.video.set(id, canvas); }
    const ctx = canvas.getContext('2d');
    // Discard the previous frame's recorded image and its owned pixel snapshot.
    ctx.reset();
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), width, height), 0, 0);
  }
  retainVideos(ids: Set<string>): void { for (const id of this.video.keys()) if (!ids.has(id)) this.video.delete(id); }
  private path(d: string): Path2D {
    let path = this.paths.get(d);
    if (!path) { path = new Path2D(d); this.paths.set(d, path); }
    return path;
  }
  private fill(ctx: SKRSContext2D, paint?: Paint) {
    if (!paint || typeof paint === 'string') return paint ?? '#000000';
    const gradient = ctx.createLinearGradient(paint.x1, paint.y1, paint.x2, paint.y2);
    for (const stop of paint.stops) gradient.addColorStop(stop.offset, stop.color);
    return gradient;
  }
  private compileText(n: Node, width: number) {
    let layout = this.prepared.text.get(n.id);
    if (!layout || layout.width !== width) { layout = layoutText(n, width, this.prepared.fonts); this.prepared.text.set(n.id, layout); }
    let compiled = this.text.get(n.id);
    if (compiled?.layout !== layout) {
      const glyphs = layout.paths.map(glyph => ({ path: this.path(glyph.d), x: glyph.x, y: glyph.y, scale: glyph.scale }));
      const bounds = [Infinity, Infinity, -Infinity, -Infinity];
      for (const glyph of glyphs) {
        const [left, top, right, bottom] = glyph.path.getBounds();
        bounds[0] = Math.min(bounds[0], glyph.x + left * glyph.scale);
        bounds[1] = Math.min(bounds[1], glyph.y - bottom * glyph.scale);
        bounds[2] = Math.max(bounds[2], glyph.x + right * glyph.scale);
        bounds[3] = Math.max(bounds[3], glyph.y - top * glyph.scale);
      }
      compiled = { layout, glyphs, bounds }; this.text.set(n.id, compiled);
    }
    return compiled;
  }
  draw(index: number): Canvas {
    if (!Number.isInteger(index) || index < 0 || index >= this.plan.frameCount) throw new RenderError('INVALID_FRAME', 'Frame is outside the composition');
    const ctx = this.canvas.getContext('2d');
    // Skia records commands; painting an opaque background alone retains history.
    ctx.reset();
    const draw = (n: Node, target: SKRSContext2D, parentWidth: number, parentHeight: number, depth: number, layoutX = 0, layoutY = 0) => {
      if (index < (n.start ?? 0) || index >= (n.end ?? this.plan.frameCount)) return;
      const opacity = evaluate(n.opacity ?? 1, index);
      if (!opacity) return;
      const width = resolveLength(n.width, parentWidth, index, parentWidth), height = resolveLength(n.height, parentHeight, index, parentHeight);
      const x = resolveLength(n.x, parentWidth, index) + layoutX, y = resolveLength(n.y, parentHeight, index) + layoutY, t = n.transform;
      if (n.type === 'rect' && !n.radius && !t && !n.clip && !n.stroke?.width && (!n.fill || typeof n.fill === 'string')) {
        // A single fill needs no path, local transform or offscreen opacity layer.
        target.save(); target.globalAlpha = opacity; target.fillStyle = n.fill ?? '#000000';
        target.fillRect(x, y, width, height); target.restore(); return;
      }
      target.save();
      target.translate(x, y); target.translate(t?.originX ?? 0, t?.originY ?? 0); target.rotate(evaluate(t?.rotation ?? 0, index) * Math.PI / 180);
      target.scale(evaluate(t?.scaleX ?? 1, index), evaluate(t?.scaleY ?? 1, index)); target.translate(-(t?.originX ?? 0), -(t?.originY ?? 0));
      if (n.clip) {
        if (n.clip.type === 'path') target.clip(this.path(n.clip.d));
        else { const p = new Path2D(); p.roundRect(0, 0, n.clip.width, n.clip.height, Math.min(n.clip.radius ?? 0, n.clip.width / 2, n.clip.height / 2)); target.clip(p); }
      }
      // Group opacity applies after children overlap; per-child globalAlpha is incorrect.
      let surface = target, layer: Canvas | undefined;
      const text = n.type === 'text' ? this.compileText(n, width) : undefined;
      let crop: { x: number; y: number; width: number; height: number } | undefined;
      if (opacity !== 1 && (n.type === 'group' || n.type === 'text' || !!n.stroke?.width)) {
        if (text) {
          const [left, top, right, bottom] = text.bounds, m = target.getTransform();
          const points = [[left, top], [right, top], [left, bottom], [right, bottom]].map(([gx, gy]) => [m.a * gx + m.c * gy + m.e, m.b * gx + m.d * gy + m.f]);
          // Integer device bounds plus transparent padding preserve subpixel edges
          // and overlapping-glyph composition without copying a whole frame.
          const x = Math.max(0, Math.floor(Math.min(...points.map(p => p[0]))) - 2);
          const y = Math.max(0, Math.floor(Math.min(...points.map(p => p[1]))) - 2);
          const endX = Math.min(this.plan.width, Math.ceil(Math.max(...points.map(p => p[0]))) + 2);
          const endY = Math.min(this.plan.height, Math.ceil(Math.max(...points.map(p => p[1]))) + 2);
          if (!text.glyphs.length || endX <= x || endY <= y) { target.restore(); return; }
          crop = { x, y, width: endX - x, height: endY - y };
        }
        if (crop) {
          layer = this.textLayers[depth];
          if (!layer || layer.width < crop.width || layer.height < crop.height) {
            layer = createCanvas(Math.min(this.plan.width, Math.max(layer?.width ?? 0, crop.width + 16)), Math.min(this.plan.height, Math.max(layer?.height ?? 0, crop.height + 16)));
            this.textLayers[depth] = layer;
          }
        } else layer = this.layers[depth] ??= createCanvas(this.plan.width, this.plan.height);
        surface = layer.getContext('2d'); surface.reset();
        if (crop) {
          surface.beginPath(); surface.rect(0, 0, crop.width, crop.height); surface.clip();
          const m = target.getTransform();
          surface.setTransform({ a: m.a, b: m.b, c: m.c, d: m.d, e: m.e - crop.x, f: m.f - crop.y });
        } else surface.setTransform(target.getTransform());
      } else surface.globalAlpha = opacity;
      surface.fillStyle = this.fill(surface, n.fill);
      surface.strokeStyle = n.stroke?.color ?? '#000000'; surface.lineWidth = n.stroke?.width ?? 1;
      surface.imageSmoothingEnabled = true; surface.imageSmoothingQuality = 'high';
      switch (n.type) {
        case 'rect': case 'ellipse': case 'path': {
          const key = `${width}/${height}`, cached = this.geometry.get(n.id);
          let p = n.type === 'path' ? this.path(n.d!) : cached?.key === key ? cached.path : undefined;
          if (!p) {
            p = new Path2D();
            if (n.type === 'rect') p.roundRect(0, 0, width, height, Math.min(n.radius ?? 0, width / 2, height / 2));
            if (n.type === 'ellipse') p.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
            this.geometry.set(n.id, { key, path: p });
          }
          surface.fill(p); if (n.stroke?.width) surface.stroke(p); break;
        }
        case 'text': {
          for (const glyph of text!.glyphs) {
            surface.save(); surface.translate(glyph.x, glyph.y); surface.scale(glyph.scale, -glyph.scale); surface.fill(glyph.path); surface.restore();
          }
          break;
        }
        case 'image': case 'video': {
          const image = n.type === 'image' ? this.images.get(n.asset!) : this.video.get(n.id);
          if (!image) throw new RenderError('MISSING_ASSET', `Node ${n.id}: image pixels are unavailable`);
          if (width === image.width && height === image.height) {
            const m = surface.getTransform();
            // Cubic filtering blurs even an identity copy in this native binding.
            if (m.a === 1 && m.b === 0 && m.c === 0 && m.d === 1 && Number.isInteger(m.e) && Number.isInteger(m.f)) surface.imageSmoothingEnabled = false;
          }
          // Match vector paint's byte-alpha precision; the binding rounds image alpha separately.
          surface.globalAlpha = Math.floor(surface.globalAlpha * 255) / 255;
          if (n.fit === 'fill') surface.drawImage(image, 0, 0, width, height);
          else {
            const scale = n.fit === 'contain' ? Math.min(width / image.width, height / image.height) : Math.max(width / image.width, height / image.height);
            const w = image.width * scale, h = image.height * scale;
            surface.save(); surface.beginPath(); surface.rect(0, 0, width, height); surface.clip();
            surface.drawImage(image, (width - w) / 2, (height - h) / 2, w, h); surface.restore();
          }
          break;
        }
        case 'group': {
          const l = n.layout, padding = l?.padding ?? 0; let cursor = padding;
          for (const child of n.children!) {
            const cw = resolveLength(child.width, width - padding * 2, index, width - padding * 2), ch = resolveLength(child.height, height - padding * 2, index, height - padding * 2);
            let cx = 0, cy = 0;
            if (l) {
              const space = l.direction === 'row' ? height - padding * 2 - ch : width - padding * 2 - cw;
              const cross = padding + (l.align === 'center' ? space / 2 : l.align === 'end' ? space : 0);
              cx = l.direction === 'row' ? cursor : cross; cy = l.direction === 'column' ? cursor : cross;
              cursor += (l.direction === 'row' ? cw : ch) + (l.gap ?? 0);
            }
            draw(child, surface, width - padding * 2, height - padding * 2, depth + 1, cx, cy);
          }
        }
      }
      if (layer) {
        target.save(); target.resetTransform(); target.globalAlpha = Math.floor(opacity * 255) / 255;
        if (crop) target.drawImage(layer, 0, 0, crop.width, crop.height, crop.x, crop.y, crop.width, crop.height);
        else target.drawImage(layer, 0, 0);
        target.restore();
      }
      target.restore();
    };
    if (this.prefixCount) {
      if (!this.prefix) {
        this.prefix = createCanvas(this.plan.width, this.plan.height);
        const prefix = this.prefix.getContext('2d'); prefix.fillStyle = this.plan.background; prefix.fillRect(0, 0, this.plan.width, this.plan.height);
        for (let i = 0; i < this.prefixCount; i++) draw(this.plan.nodes[i], prefix, this.plan.width, this.plan.height, 0);
      }
      ctx.drawImage(this.prefix, 0, 0);
    } else { ctx.fillStyle = this.plan.background; ctx.fillRect(0, 0, this.plan.width, this.plan.height); }
    for (let i = this.prefixCount; i < this.plan.nodes.length; i++) draw(this.plan.nodes[i], ctx, this.plan.width, this.plan.height, 0);
    return this.canvas;
  }
  render(index: number, encodePng = false): { pixels: Buffer; png: Buffer } {
    const ctx = this.draw(index).getContext('2d');
    const data = ctx.getImageData(0, 0, this.plan.width, this.plan.height).data;
    return { pixels: Buffer.from(data.buffer, data.byteOffset, data.byteLength), png: encodePng ? this.canvas.toBuffer('image/png') : Buffer.alloc(0) };
  }
}
