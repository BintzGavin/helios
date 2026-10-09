#!/usr/bin/env node
// Deterministic generator for the Helios identity.
// Run: node assets/brand/generate.mjs
// Every SVG in assets/brand, docs/site/logo and plugins/helios/assets is written by this file.
// PNG rasters are written by assets/brand/rasterize.mjs (Playwright + the bundled Chromium).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
export const color = {
  umbra: '#0E0D0B', // ink
  bone: '#F3EEE3', // paper
  solar: '#F5B400', // the sun
  solarDeep: '#7F5900', // sun for text on paper (AA)
  ember: '#E4572E',
  noon: '#2F7FE0',
  white: '#FFFFFF',
};

// ---------------------------------------------------------------------------
// The mark: "the seeking sun"
// A solid disc and twelve equal-width rays. Ray length grows clockwise from
// twelve o'clock, so the sun reads as a clock face and a progress ring at once.
// The step between the longest and the shortest ray is the playhead.
// ---------------------------------------------------------------------------
const f = (n) => Number(n.toFixed(2));

export function markGeometry({ rays = 12, disc = 19, inner = 27, min = 33, max = 48, width = 8 } = {}) {
  const bars = [];
  for (let i = 0; i < rays; i++) {
    const a = ((-90 + (i * 360) / rays) * Math.PI) / 180;
    const outer = rays === 1 ? max : min + (i * (max - min)) / (rays - 1);
    const h = width / 2;
    const cos = Math.cos(a), sin = Math.sin(a);
    const pt = (r, t) => [f(50 + r * cos - t * sin), f(50 + r * sin + t * cos)];
    bars.push([pt(inner, -h), pt(outer, -h), pt(outer, h), pt(inner, h)]);
  }
  return { disc, bars };
}

/** Path data for the mark in a 100x100 box, centred at 50,50. One path, so it can be filled with one colour. */
export function markPath(opts) {
  const { disc, bars } = markGeometry(opts);
  const d = [
    // disc as two arcs
    `M${f(50 - disc)} 50a${disc} ${disc} 0 1 0 ${f(disc * 2)} 0a${disc} ${disc} 0 1 0 ${f(-disc * 2)} 0Z`,
    ...bars.map((b) => `M${b.map((p) => p.join(' ')).join('L')}Z`),
  ];
  return d.join('');
}

export const MARK = markPath();
// Compact cut for 24px and below: thicker rays, fewer steps, larger disc.
export const MARK_COMPACT = markPath({ rays: 8, disc: 21, inner: 29, min: 36, max: 48, width: 10 });

// ---------------------------------------------------------------------------
// The wordmark: HELIOS drawn from circles and bars (cap height 100, stem 22)
// ---------------------------------------------------------------------------
const STEM = 22;
function rect(x, y, w, h) { return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`; }
function ring(cx, cy, ro, ri) {
  return `M${f(cx - ro)} ${f(cy)}a${ro} ${ro} 0 1 0 ${f(ro * 2)} 0a${ro} ${ro} 0 1 0 ${f(-ro * 2)} 0Z` +
    `M${f(cx - ri)} ${f(cy)}a${ri} ${ri} 0 1 1 ${f(ri * 2)} 0a${ri} ${ri} 0 1 1 ${f(-ri * 2)} 0Z`;
}
// Letters return { width, fill paths[], stroke path? }
const letters = {
  H: { w: 80, d: rect(0, 0, STEM, 100) + rect(80 - STEM, 0, STEM, 100) + rect(0, 39, 80, STEM) },
  E: { w: 68, d: rect(0, 0, STEM, 100) + rect(0, 0, 68, STEM) + rect(0, 39, 60, STEM) + rect(0, 100 - STEM, 68, STEM) },
  L: { w: 64, d: rect(0, 0, STEM, 100) + rect(0, 100 - STEM, 64, STEM) },
  I: { w: STEM, d: rect(0, 0, STEM, 100) },
  O: { w: 100, d: ring(50, 50, 51.5, 51.5 - STEM) }, // 1.5 overshoot above and below the cap line
  // S: two arcs on the stroke centreline, cut with butt terminals.
  S: (() => {
    const r = 20.25, cx = 36, top = 29.75, bot = 70.25; // overshoots the cap line by 1.5
    const a1 = (-30 * Math.PI) / 180, a2 = (150 * Math.PI) / 180;
    const p1 = [f(cx + r * Math.cos(a1)), f(top + r * Math.sin(a1))];
    const p2 = [f(cx + r * Math.cos(a2)), f(bot + r * Math.sin(a2))];
    return {
      w: 67.25,
      stroke: `M${p1.join(' ')}A${r} ${r} 0 1 0 ${cx} 50A${r} ${r} 0 1 1 ${p2.join(' ')}`,
    };
  })(),
};
const KERN = { HE: 16, EL: 16, LI: 11, IO: 15, OS: 15 };

export function wordmark(fill) {
  const word = 'HELIOS';
  let x = 0;
  const out = [];
  for (let i = 0; i < word.length; i++) {
    const L = letters[word[i]];
    if (L.d) out.push(`<path transform="translate(${f(x)} 0)" fill="${fill}" d="${L.d}"/>`);
    if (L.stroke) out.push(`<path transform="translate(${f(x)} 0)" fill="none" stroke="${fill}" stroke-width="${STEM}" d="${L.stroke}"/>`);
    x += L.w;
    if (i < word.length - 1) x += KERN[word[i] + word[i + 1]];
  }
  return { svg: out.join('\n    '), width: f(x) };
}
export const WORD_WIDTH = wordmark('#000').width;

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------
const svg = (w, h, body, { title = 'Helios' } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${title}">\n  <title>${title}</title>\n  ${body}\n</svg>\n`;

function markSvg(fill, { size = 512, compact = false, bg = null } = {}) {
  const d = compact ? MARK_COMPACT : MARK;
  const body = (bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>\n  ` : '') +
    `<path transform="scale(${f(size / 100)})" fill="${fill}" d="${d}"/>`;
  return svg(size, size, body, { title: 'Helios mark' });
}

function lockupHorizontal(fill, { bg = null } = {}) {
  // mark at 140 units tall, wordmark cap height 100 centred on the disc
  const markSize = 140, gap = 44, pad = 20;
  const { svg: word, width } = wordmark(fill);
  const w = pad * 2 + markSize + gap + width;
  const h = markSize + pad * 2;
  const body = (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>\n  ` : '') +
    `<path transform="translate(${pad} ${pad}) scale(${f(markSize / 100)})" fill="${fill}" d="${MARK}"/>\n  ` +
    `<g transform="translate(${pad + markSize + gap} ${pad + (markSize - 100) / 2})">\n    ${word}\n  </g>`;
  return svg(f(w), f(h), body, { title: 'Helios' });
}

function lockupStacked(fill, { bg = null } = {}) {
  const markSize = 220, gap = 36, pad = 32;
  const { svg: word, width } = wordmark(fill);
  const w = pad * 2 + Math.max(markSize, width);
  const h = pad * 2 + markSize + gap + 100;
  const body = (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>\n  ` : '') +
    `<path transform="translate(${f((w - markSize) / 2)} ${pad}) scale(${f(markSize / 100)})" fill="${fill}" d="${MARK}"/>\n  ` +
    `<g transform="translate(${f((w - width) / 2)} ${pad + markSize + gap})">\n    ${word}\n  </g>`;
  return svg(f(w), f(h), body, { title: 'Helios' });
}

function wordmarkSvg(fill) {
  const pad = 16;
  const { svg: word, width } = wordmark(fill);
  return svg(f(width + pad * 2), 100 + pad * 2, `<g transform="translate(${pad} ${pad})">\n    ${word}\n  </g>`, { title: 'Helios wordmark' });
}

/** App icon: umbra square, solar mark at 72% of the tile. Corner masking is left to each host. */
function appIcon(size = 1024) {
  const inset = size * 0.14;
  const s = size - inset * 2;
  return svg(size, size,
    `<rect width="${size}" height="${size}" fill="${color.umbra}"/>\n  ` +
    `<path transform="translate(${f(inset)} ${f(inset)}) scale(${f(s / 100)})" fill="${color.solar}" d="${MARK}"/>`,
    { title: 'Helios' });
}

/** Composer icon for ChatGPT / Codex: 20x20, single colour, uses currentColor. */
function composerIcon() {
  return svg(20, 20, `<path transform="scale(0.2)" fill="currentColor" d="${MARK_COMPACT}"/>`, { title: 'Helios' });
}

/** Social card 1200x630 */
function socialCard() {
  const { svg: word, width } = wordmark(color.bone);
  const markSize = 300;
  return svg(1200, 630,
    `<rect width="1200" height="630" fill="${color.umbra}"/>\n  ` +
    `<path transform="translate(120 165) scale(${f(markSize / 100)})" fill="${color.solar}" d="${MARK}"/>\n  ` +
    `<g transform="translate(500 ${f(165 + (markSize - 100 * (560 / width)) / 2)}) scale(${f(560 / width)})">\n    ${word}\n  </g>`,
    { title: 'Helios: video is light over time' });
}

const files = {
  'assets/brand/mark.svg': markSvg(color.umbra),
  'assets/brand/mark-bone.svg': markSvg(color.bone),
  'assets/brand/mark-solar.svg': markSvg(color.solar),
  'assets/brand/mark-compact.svg': markSvg(color.umbra, { size: 64, compact: true }),
  'assets/brand/wordmark.svg': wordmarkSvg(color.umbra),
  'assets/brand/wordmark-bone.svg': wordmarkSvg(color.bone),
  'assets/brand/lockup-horizontal.svg': lockupHorizontal(color.umbra),
  'assets/brand/lockup-horizontal-bone.svg': lockupHorizontal(color.bone),
  'assets/brand/lockup-horizontal-solar-on-umbra.svg': lockupHorizontal(color.solar, { bg: color.umbra }),
  'assets/brand/lockup-stacked.svg': lockupStacked(color.umbra),
  'assets/brand/lockup-stacked-bone.svg': lockupStacked(color.bone),
  'assets/brand/icon.svg': appIcon(1024),
  'assets/brand/composer-icon.svg': composerIcon(),
  'assets/brand/social-card.svg': socialCard(),
  'docs/site/logo/light.svg': lockupHorizontal(color.umbra),
  'docs/site/logo/dark.svg': lockupHorizontal(color.bone),
  'plugins/helios/assets/composer-icon.svg': composerIcon(),
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(repo, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
    console.log('wrote', rel);
  }
}
