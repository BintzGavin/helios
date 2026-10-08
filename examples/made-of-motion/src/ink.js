// Frame-exact vector ink (port of vector_ink.rs and ink.rs): 34,272 rotoscoped contours
// from the fframes archives, drawn per global frame, plus floating dust and the shader
// flares at ring collisions.

import { animate, Easing, seconds, timeline, Transform, transformTimeline } from './anim.js';
import { LETTERS } from './captures.js';
import { circlePath } from './painter.js';

const PIGMENTS = [
  '#0a0907', '#40220f', '#c91c14', '#fffbea', '#ff2414', '#ffd155', '#c91c14', '#c91c14',
  '#c91c14', '#c91c14', '#b91613',
];

const CHUNKS = ['000', '100', '200', '300', '400'];

async function gunzipText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Missing ${url}. Run scripts/fetch-assets.mjs first.`);
  return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();
}

export class VectorInk {
  /** Decompress the archives once; paths are only parsed for the frames that are drawn. */
  static async load(dir) {
    const texts = await Promise.all(CHUNKS.map((c) => gunzipText(`${dir}/${c}.paths.gz`)));
    return new VectorInk(texts.join(''));
  }

  constructor(source) {
    this.source = source;
    // Per frame: base contours in file order, then the four letter-mark tracks (pigments 6-9).
    this.entries = Array.from({ length: 489 }, () => ({ base: [], marks: [[], [], [], []] }));
    let at = 0;
    while (at < source.length) {
      let end = source.indexOf('\n', at);
      if (end < 0) end = source.length;
      const a = source.indexOf('|', at);
      const b = a < 0 ? -1 : source.indexOf('|', a + 1);
      const c = b < 0 ? -1 : source.indexOf('|', b + 1);
      if (c > 0 && c < end) {
        const index = Number(source.slice(at, a));
        const pigment = Number(source.slice(a + 1, b));
        const opacity = Math.fround(Number(source.slice(b + 1, c)));
        const frame = this.entries[index];
        if (Number.isInteger(index) && frame && PIGMENTS[pigment] && Number.isFinite(opacity)) {
          const path = { color: PIGMENTS[pigment], opacity, start: c + 1, end, shape: null };
          if (pigment >= 6 && pigment < 10) frame.marks[pigment - 6].push(path);
          else frame.base.push(path);
        }
      }
      at = end + 1;
    }
    this.cache = [];
  }

  shapes(list) {
    for (const p of list) {
      if (!p.shape) p.shape = new Path2D(this.source.slice(p.start, p.end));
    }
    return list;
  }

  /** Keep parsed Path2Ds for the last few frames only. */
  frame(index) {
    const frame = this.entries[index];
    if (!frame) return null;
    if (!this.cache.includes(frame)) {
      this.cache.push(frame);
      if (this.cache.length > 6) {
        const old = this.cache.shift();
        for (const p of [...old.base, ...old.marks.flat()]) p.shape = null;
      }
      this.shapes(frame.base);
      frame.marks.forEach((m) => this.shapes(m));
    }
    return frame;
  }

  static fill(c, list) {
    // Each contour is `<path opacity>`; fframes folds a lone path's opacity into its paint.
    for (const p of list) {
      c.globalAlpha = p.opacity;
      c.fillStyle = p.color;
      c.fill(p.shape, 'evenodd');
    }
    c.globalAlpha = 1;
  }

  draw(c, index) {
    const frame = this.frame(index);
    if (!frame) return;
    VectorInk.fill(c, frame.base);
    frame.marks.forEach((m) => VectorInk.fill(c, m));
  }
}

const questionRetarget = transformTimeline([
  {
    at: 1.125, end: 1.291667,
    from: Transform.identity(),
    to: Transform.of({ tx: 206.125, ty: -3, sx: 0.875, sy: 1 }),
    easing: Easing.EaseInOut,
  },
  {
    at: 1.458333, end: 1.541667,
    from: Transform.of({ tx: 206.125, ty: -3, sx: 0.875, sy: 1 }),
    to: Transform.identity(),
    easing: Easing.EaseIn,
  },
]);

/**
 * Retarget the reference's "you're" loop to "code" in the opening copy, then release it
 * with the original pen's exit.
 */
export function drawQuestionInk(painter, c, ink, t, index) {
  painter.group(c, { transform: animate(questionRetarget, t) }, (g) => ink.draw(g, index));
}

const markZoom = transformTimeline([{
  at: 2.541667, end: 2.666667, from: Transform.scale(1), to: Transform.scale(2.8), easing: Easing.EaseIn,
}]);
const blackFade = timeline([{ at: 2.541667, end: 2.708333, from: 1, to: 0, easing: Easing.EaseOut }]);
const pullback = transformTimeline([{
  at: 2.666667, end: 2.833333, from: Transform.scale(1), to: Transform.scale(1 / 2.8),
  easing: Easing.cubicBezier(0.12, 0.92, 0.20, 1),
}]);

/**
 * Preserve source nib shapes and exposure timing through the seven brand flights and the
 * final camera pullback; only the independent black gestures fade.
 */
export function drawSignatureInk(painter, c, ink, t, global, letters) {
  const n = Math.min(global, 488);
  const frame = ink.frame(n);
  const source = LETTERS[Math.min(Math.max(n - 413, 0), LETTERS.length - 1)];
  painter.group(c, { opacity: animate(blackFade, t) }, (g) => VectorInk.fill(g, frame.base));
  painter.group(c, { transform: Transform.translate(720, 540) }, (g) => {
    painter.group(g, { transform: animate(pullback, t) }, (g2) => {
      painter.group(g2, { transform: Transform.translate(-720, -540) }, (g3) => {
        letters.forEach((letter, i) => {
          const [sx, sy] = source[i % 4];
          const [x, y] = letter.position;
          painter.group(g3, { transform: Transform.translate(x, y) }, (g4) => {
            painter.group(g4, { transform: animate(markZoom, t) }, (g5) => {
              painter.group(g5, { transform: Transform.translate(-sx, -sy) }, (g6) => {
                VectorInk.fill(g6, frame.marks[i % 4]);
              });
            });
          });
        });
      });
    });
  });
}

/** Ten slow dust particles; light ones on the dark feature cards. */
export function drawDust(c, global, light) {
  const f = Math.fround;
  // f32, like the Rust: anti-aliasing samples sub-scanlines, so the last bit can show.
  const remEuclid = (a, b) => { const r = f(a % b); return r < 0 ? f(r + b) : r; };
  const t = f(f(global) / 24);
  c.fillStyle = light ? '#ded7c9' : '#2c2825';
  c.globalAlpha = 0.32;
  for (let i = 0; i < 10; i++) {
    const p = i;
    const x = f(135 + remEuclid(f(f(p * 431) + f(t * f(11 + p))), 1170));
    const y = f(110 + remEuclid(f(f(p * 197) - f(t * f(5 + f(p * 2)))), 860));
    const r = f(i % 3 === 0 ? 1.7 : 0.8);
    c.fill(circlePath(x, y, r));
  }
  c.globalAlpha = 1;
}

/** Shader flares where the ring objects collide with the ink, seven frames each. */
export function drawImpacts(stage, c, impacts, global, t, local) {
  for (const hit of impacts) {
    const age = global - hit.at;
    if (age < 0 || age >= 7) continue;
    const [x, y] = hit.position;
    stage.draw(c, 'impact', [x - 170, y - 170, 340, 340], {
      uAge: age,
      uSeed: hit.at,
      uDirection: hit.direction,
    }, { time: t, frame: local });
  }
}

export { seconds };
