// Text as filled outlines, the way fframes draws it: usvgr shapes each <text> with
// rustybuzz (HarfBuzz rules, default features), turns every glyph into a path and Skia
// fills those paths. Doing the same here, with HarfBuzz compiled to WASM, puts every
// glyph on exactly the same curves instead of going through the browser's font rasterizer.

import * as hb from '../vendor/harfbuzzjs/index.mjs';

const f = Math.fround;

export const FONT_FILES = {
  'Inter 24pt': 'Inter_24pt-Bold.ttf',
  'Instrument Serif': 'InstrumentSerif-Italic.ttf',
  'JetBrains Mono': 'JetBrainsMono-Regular.ttf',
};

const fonts = new Map();

export async function loadFonts(dir) {
  await Promise.all(Object.entries(FONT_FILES).map(async ([family, file]) => {
    const response = await fetch(`${dir}/${file}`);
    if (!response.ok) throw new Error(`Missing font ${dir}/${file}. Run scripts/fetch-assets.mjs first.`);
    const face = new hb.Face(new hb.Blob(await response.arrayBuffer()));
    fonts.set(family, { font: new hb.Font(face), upem: face.upem, outlines: new Map() });
  }));
}

function font(family) {
  const entry = fonts.get(family);
  if (!entry) throw new Error(`Font ${family} is not loaded`);
  return entry;
}

function outline(entry, glyph) {
  let commands = entry.outlines.get(glyph);
  if (!commands) {
    commands = entry.font.glyphToJson(glyph);
    entry.outlines.set(glyph, commands);
  }
  return commands;
}

function shape(entry, text) {
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(entry.font, buffer);
  const infos = buffer.getGlyphInfos();
  const positions = buffer.getGlyphPositions();
  return infos.map((info, i) => ({ id: info.codepoint, cluster: info.cluster, ...positions[i] }));
}

/**
 * Glyph clusters of one text chunk with usvgr's positions: letter-spacing after every
 * cluster but the last, then the text-anchor shift by half (or all) of the total advance.
 */
export function layout(family, size, text, letterSpacing = 0, anchor = 'start') {
  const entry = font(family);
  const sx = f(f(size) / f(entry.upem));
  const clusters = [];
  for (const glyph of shape(entry, text)) {
    let cluster = clusters[clusters.length - 1];
    if (!cluster || cluster.cluster !== glyph.cluster) {
      cluster = { cluster: glyph.cluster, glyphs: [], advance: 0, x: 0, pen: 0 };
      clusters.push(cluster);
    }
    cluster.glyphs.push({ id: glyph.id, offset: f(cluster.pen + glyph.xOffset), dy: glyph.yOffset });
    cluster.pen = f(cluster.pen + glyph.xAdvance);
    cluster.advance = f(cluster.advance + f(glyph.xAdvance * sx));
  }
  if (letterSpacing) {
    clusters.forEach((cluster, i) => {
      if (i !== clusters.length - 1) cluster.advance = f(cluster.advance + f(letterSpacing));
    });
  }
  const width = clusters.reduce((w, c) => f(w + c.advance), 0);
  let x = anchor === 'middle' ? f(-width / 2) : anchor === 'end' ? -width : 0;
  for (const cluster of clusters) {
    cluster.x = x;
    x = f(x + cluster.advance);
  }
  return { entry, sx, clusters, width };
}

/** Index of the character each cluster starts at, for splitting a chunk into spans. */
function clusterChar(text, cluster) {
  // HarfBuzz reports UTF-16 offsets here; every string in this film is in the BMP.
  return cluster;
}

const paths = new Map();

/**
 * Path2D outlines for a `<text>` element, one per span. `spans` lists character ranges
 * `[start, end)` (a `<tspan>` with its own fill); the default is one span for all text.
 */
export function textPaths(family, size, x, y, text, { letterSpacing = 0, anchor = 'start', spans } = {}) {
  const key = [family, size, x, y, text, letterSpacing, anchor, JSON.stringify(spans || null)].join('|');
  let cached = paths.get(key);
  if (cached) return cached;
  const ranges = spans || [[0, text.length]];
  cached = ranges.map(([start, end]) => {
    const path = new Path2D();
    eachOutline(family, size, x, y, text, { letterSpacing, anchor }, start, end, (type, p) => {
      switch (type) {
        case 'M': path.moveTo(...p[0]); break;
        case 'L': path.lineTo(...p[0]); break;
        case 'Q': path.quadraticCurveTo(...p[0], ...p[1]); break;
        case 'C': path.bezierCurveTo(...p[0], ...p[1], ...p[2]); break;
        case 'Z': path.closePath(); break;
        default: break;
      }
    });
    return path;
  });
  paths.set(key, cached);
  return cached;
}

/** Visit the outline commands of the clusters starting in `[start, end)`, in text space. */
function eachOutline(family, size, x, y, text, { letterSpacing, anchor }, start, end, visit) {
  const { entry, sx, clusters } = layout(family, size, text, letterSpacing, anchor);
  const tx = f(x);
  const ty = f(y);
  for (const cluster of clusters) {
    const at = clusterChar(text, cluster.cluster);
    if (at < start || at >= end) continue;
    for (const glyph of cluster.glyphs) {
      // usvgr: scale(1, -1) · scale(sx) · translate(pen + dx, dy), then the cluster's
      // translate(x, 0) and the chunk's translate(x, y); tiny-skia rounds each to f32.
      const e = f(glyph.offset * sx);
      const fy = f(-f(glyph.dy * sx));
      const map = (px, py) => [
        f(f(f(f(px * sx) + e) + cluster.x) + tx),
        f(f(f(-f(py * sx)) + fy) + ty),
      ];
      for (const cmd of outline(entry, glyph.id)) {
        const v = cmd.values;
        const points = [];
        for (let i = 0; i + 1 < v.length; i += 2) points.push(map(v[i], v[i + 1]));
        visit(cmd.type, points);
      }
    }
  }
}

/**
 * The tight bounding box `[left, top, right, bottom]` of a `<text>` element's outlines, curve
 * extrema included, like tiny-skia's `compute_tight_bounds` that usvgr uses for layer bounds.
 */
export function textBounds(family, size, x, y, text, { letterSpacing = 0, anchor = 'start' } = {}) {
  let [l, t, r, b] = [Infinity, Infinity, -Infinity, -Infinity];
  const add = ([px, py]) => {
    l = Math.min(l, px); t = Math.min(t, py); r = Math.max(r, px); b = Math.max(b, py);
  };
  const extrema = (a, c, d) => {
    const denominator = a - c - c + d;
    const at = denominator === 0 ? -1 : (a - c) / denominator;
    return at > 0 && at < 1 ? [at] : [];
  };
  let last = [0, 0];
  eachOutline(family, size, x, y, text, { letterSpacing, anchor }, 0, text.length, (type, p) => {
    if (type === 'Q') {
      const [p0, p1, p2] = [last, ...p];
      for (const axis of [0, 1]) {
        for (const at of extrema(p0[axis], p1[axis], p2[axis])) {
          const u = 1 - at;
          add([0, 1].map((k) => u * u * p0[k] + 2 * u * at * p1[k] + at * at * p2[k]));
        }
      }
    } else if (type === 'C') {
      throw new Error('textBounds handles TrueType (quadratic) outlines only');
    }
    if (p.length) {
      add(p[p.length - 1]);
      last = p[p.length - 1];
    }
  });
  return [l, t, r, b];
}

/**
 * `frame.text_width` in fframes: the sum of each character's horizontal advance, scaled
 * to the font size with integer division (no kerning, no letter-spacing).
 */
export function textWidth(family, size, text) {
  const entry = font(family);
  let width = 0;
  for (const ch of text) {
    const [glyph] = shape(entry, ch);
    width += Math.floor((size * entry.font.glyphHAdvance(glyph.id)) / entry.upem);
  }
  return width;
}
