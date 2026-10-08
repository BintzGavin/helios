// SVG-style drawing on a 2D canvas: groups with transforms, group opacity rendered through
// an offscreen layer (like Skia's saveLayer in fframes), filters, and the type labels.

import { Transform } from './anim.js';
import { textPaths } from './text.js';

const f = Math.fround;

/** SkMatrix::mapRect for an affine matrix, in f32: the box around the four mapped corners. */
function mapRect(m, [l, t, r, b]) {
  const xs = [l, r].flatMap((x) => [t, b].map((y) => f(f(f(m.a * x) + f(m.c * y)) + m.e)));
  const ys = [l, r].flatMap((x) => [t, b].map((y) => f(f(f(m.b * x) + f(m.d * y)) + m.f)));
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export class Painter {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.pool = [];
  }

  acquire() {
    const layer = this.pool.pop() || (() => {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      return { canvas, ctx: canvas.getContext('2d') };
    })();
    layer.ctx.reset();
    layer.ctx.miterLimit = 4; // SVG's default; the canvas default is 10
    layer.ctx.clearRect(0, 0, this.width, this.height);
    return layer;
  }

  /**
   * `<g transform opacity filter>`: children draw with the group's transform; a group
   * with opacity below 1 or a filter is isolated in a layer and composited afterwards.
   *
   * `bounds` (`[left, top, right, bottom]` in the group's space) sizes the layer the way
   * Skia's saveLayer does: its pixels start at the rounded-out device box of the bounds, so
   * children rasterize at coordinates shifted by whole pixels, and edges can round differently.
   */
  group(c, { opacity = 1, transform, filter, bounds } = {}, draw) {
    if (opacity <= 0) return;
    c.save();
    if (transform) c.transform(...(Array.isArray(transform) ? transform : Transform.matrix(transform)));
    if (opacity >= 1 && !filter) {
      draw(c);
      c.restore();
      return;
    }
    const layer = this.acquire();
    const m = c.getTransform();
    let x = 0;
    let y = 0;
    if (bounds) {
      const [l, t, r, b] = mapRect(m, bounds);
      x = Math.max(0, Math.floor(l));
      y = Math.max(0, Math.floor(t));
      layer.ctx.beginPath();
      layer.ctx.rect(0, 0, Math.ceil(r) - x, Math.ceil(b) - y);
      layer.ctx.clip();
      // SkDevice::setDeviceCoordinateSystem: the CTM, translated by -origin in f32.
      layer.ctx.setTransform(f(m.a), f(m.b), f(m.c), f(m.d), f(f(m.e) - x), f(f(m.f) - y));
    } else {
      layer.ctx.setTransform(m);
    }
    draw(layer.ctx);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha *= opacity;
    if (filter) c.filter = filter;
    c.drawImage(layer.canvas, x, y);
    c.restore();
    this.pool.push(layer);
  }

  /**
   * A group with an SVG `<filter>` (`filter`, a canvas filter such as `url(#id)`, built for the
   * region `[left, top, right, bottom]` with its origin at `[ox, oy]`), drawn the way fframes
   * does: the group rasterizes into a layer cut to the region's pixels, the filter turns the
   * layer into an 8-bit image, and that image is drawn with the group's opacity.
   */
  filtered(c, { opacity = 1, region, filter }, draw) {
    const [ox, oy] = filterOrigin(region);
    const source = this.acquire();
    const right = Math.min(this.width, Math.ceil(region[2]));
    const bottom = Math.min(this.height, Math.ceil(region[3]));
    source.ctx.beginPath();
    source.ctx.rect(0, 0, right - ox, bottom - oy);
    source.ctx.clip();
    source.ctx.translate(-ox, -oy);
    draw(source.ctx);
    const image = this.acquire();
    image.ctx.filter = filter;
    image.ctx.drawImage(source.canvas, 0, 0);
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha *= opacity;
    c.drawImage(image.canvas, ox, oy);
    c.restore();
    this.pool.push(source, image);
  }
}

/** The device pixel where fframes' filtered layer for `region` starts. */
export function filterOrigin([left, top]) {
  return [Math.max(0, Math.floor(left)), Math.max(0, Math.floor(top))];
}

/** fframes' `label`: Inter 24pt Bold with -1.25 letter-spacing. */
export function label(c, copy, x, y, size, color, center = false) {
  const [path] = textPaths('Inter 24pt', size, x, y, copy, {
    letterSpacing: -1.25,
    anchor: center ? 'middle' : 'start',
  });
  c.fillStyle = color;
  c.fill(path);
}

/** A filled `<text>` (optionally with a stroke drawn over the fill, as SVG paints it). */
export function text(c, { family, size, x = 0, y = 0, copy, fill, letterSpacing = 0, anchor = 'start', stroke, strokeWidth }) {
  const [path] = textPaths(family, size, x, y, copy, { letterSpacing, anchor });
  c.fillStyle = fill;
  c.fill(path);
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = strokeWidth;
    c.stroke(path);
  }
}

/** fframes draws `<circle>` as an analytic Skia oval; a full canvas arc is the same oval. */
export function circlePath(cx, cy, r) {
  const path = new Path2D();
  path.arc(cx, cy, r, 0, 2 * Math.PI);
  return path;
}
