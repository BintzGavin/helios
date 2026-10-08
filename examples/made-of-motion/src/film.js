// "Made of motion": a Helios port of the 489-frame fframes promo (examples/made-of-motion in
// dmtrKovalenko/fframes, PR #193). The scene list, the studio layers and every shot follow
// lib.rs; `render(ctx, frame)` draws one frame as a pure function of its index.

import { animate, Easing, f, seconds, timeline, Transform, transformTimeline } from './anim.js';
import { HAND, STAR } from './captures.js';
import { letterFlights } from './flight.js';
import { ShaderStage } from './gl.js';
import { Heroes, typeBlock } from './hero.js';
import { drawDust, drawImpacts, drawQuestionInk, drawSignatureInk, VectorInk } from './ink.js';
import { cosf } from './libm.js';
import { choreography, hero } from './objects.js';
import { Enhancer } from './enhance.js';
import { drawOpening, QUESTION } from './opening.js';
import { OPENING_TYPE } from './opening-type.js';
import { circlePath, label, Painter, text } from './painter.js';
import * as shaders from './shaders.js';
import { loadFonts, textBounds, textPaths } from './text.js';

export const WIDTH = 1440;
export const HEIGHT = 1080;
export const FPS = 24;
export const FRAMES = 489;
export const DURATION = FRAMES / FPS;

// Source frame boundaries, end exclusive, aligned to the music edit.
const EDIT = [
  ['Question', 48, 'question'],
  ['Signal', 93, 'signal'],
  ['Portrait', 153, 'portrait'],
  ['ThermalCut', 157, 'thermal'],
  ['Orbit', 200, 'ring'],
  ['Code', 220, 'code'],
  ['CarouselA', 237, 'carousel'],
  ['Motion', 253, 'motion'],
  ['CarouselB', 265, 'carousel'],
  ['Feeling', 286, 'feeling'],
  ['OrbitReturn', 302, 'ring'],
  ['Scatter', 331, 'scatter'],
  ['Human', 382, 'hand'],
  ['M', 389, 'pulse0'],
  ['O', 397, 'pulse1'],
  ['V', 403, 'pulse2'],
  ['E', 413, 'pulse3'],
  ['Fframes', 489, 'signature'],
];

export const SCENES = EDIT.map(([name, end, kind], i) => ({
  name, kind, start: i === 0 ? 0 : EDIT[i - 1][1], end,
}));

const FULL = [0, 0, WIDTH, HEIGHT];

const signalObjectsFade = timeline([{ at: 1.25, end: 1.375, from: 1, to: 0, easing: Easing.EaseIn }]);
const thermalObjectsFade = timeline([{ at: 0, end: 0.125, from: 0, to: 0.94, easing: Easing.EaseOut }]);
const handCaption = timeline([{ at: 0.416667, end: 0.625, from: 0, to: 1, easing: Easing.EaseOut }]);
const orbitFade = timeline([{ at: 2.625, end: 2.666667, from: 1, to: 0, easing: Easing.EaseOut }]);
const wordFade = timeline([{ at: 2.625, end: 2.666667, from: 0, to: 1, easing: Easing.EaseOut }]);
const wordScale = transformTimeline([{
  at: 2.666667, end: 2.833333, from: Transform.scale(2.8), to: Transform.scale(1),
  easing: Easing.cubicBezier(0.12, 0.92, 0.20, 1),
}]);
const tagFade = timeline([{ at: 2.833333, end: 3.083333, from: 0, to: 1, easing: Easing.EaseOut }]);
const tagSlide = transformTimeline([{
  at: 2.833333, end: 3.083333, from: Transform.translate(0, 12), to: Transform.translate(0, 0),
  easing: Easing.EaseOut,
}]);

async function bitmap(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Missing ${url}. Run scripts/fetch-assets.mjs first.`);
  return createImageBitmap(await response.blob(), {
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
  });
}

/** Rust's `{}` for an f32 (the shortest decimal that reads back as the same f32), read as f64. */
function printed(x) {
  for (let digits = 1; digits < 9; digits++) {
    const value = Number(x.toPrecision(digits));
    if (Math.fround(value) === x) return value;
  }
  return x;
}

/**
 * The flying letters' `transform="translate(x y) rotate(angle) scale(scale)"`: fframes formats
 * the f32 pose into the attribute, and usvgr parses it back in f64 before casting to f32.
 */
function poseMatrix({ position: [x, y], angle, scale }) {
  const r = printed(angle) * (Math.PI / 180);
  const s = printed(scale);
  return [Math.cos(r) * s, Math.sin(r) * s, -Math.sin(r) * s, Math.cos(r) * s, x, y];
}

/**
 * `<ellipse cx="720" cy="535" rx="76" ry="184" fill="url(#stack-light)">`, a radial gradient
 * from #e8e8df to transparent. Skia draws an undithered gradient on its 8-bit (lowp) pipeline,
 * and Chrome always dithers canvas gradients, so the pixels are computed here the way lowp
 * does: alpha rounded to 8 bits, then integer premultiply and src-over. Coverage at the edge
 * comes from Chrome's own rasterization of the same oval.
 */
function stackLight(c, painter) {
  const [x0, y0, w, h] = [644, 351, 152, 368];
  const mask = painter.acquire();
  mask.ctx.fillStyle = '#fff';
  const oval = new Path2D();
  oval.ellipse(720, 535, 76, 184, 0, 0, 2 * Math.PI);
  mask.ctx.fill(oval);
  const coverage = mask.ctx.getImageData(x0, y0, w, h).data;
  painter.pool.push(mask);
  const image = c.getImageData(x0, y0, w, h);
  const px = image.data;
  // The bbox matrix [152 0 644; 0 368 351] inverted, then the gradient's center 0.5 and
  // radius 0.5 mapped to the unit circle, composed like SkMatrix in f32.
  const sx = f(2 * f(1 / 152));
  const sy = f(2 * f(1 / 368));
  const tx = f(f(2 * f(-644 * f(1 / 152))) - 1);
  const ty = f(f(2 * f(-351 * f(1 / 368))) - 1);
  const color = [232, 232, 223];
  const div255 = (v) => (v + 255) >> 8;
  const div255Accurate = (v) => ((v + 128) + ((v + 128) >> 8)) >> 8;
  for (let j = 0; j < h; j++) {
    const v = f(f(f(y0 + j + 0.5) * sy) + ty);
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      const cov = coverage[k + 3];
      if (!cov) continue;
      const u = f(f(f(x0 + i + 0.5) * sx) + tx);
      const t = Math.min(1, Math.max(0, f(Math.sqrt(f(f(u * u) + f(v * v))))));
      let a = Math.trunc(f(f(f(1 - t) * 255) + 0.5));
      let src = color.map((ch) => div255Accurate(ch * a));
      if (cov === 255) {
        for (let n = 0; n < 3; n++) px[k + n] = src[n] + div255(px[k + n] * (255 - a));
      } else {
        src = src.map((ch) => div255(ch * cov));
        a = div255(a * cov);
        for (let n = 0; n < 3; n++) px[k + n] = src[n] + div255Accurate(px[k + n] * (255 - a));
      }
    }
  }
  c.putImageData(image, x0, y0);
}

export class Film {
  /** `enhanced: true` grades every frame with the extra shader passes in enhance.js. */
  static async load(assets = 'assets', { enhanced = false } = {}) {
    const [, ink, atlas, field] = await Promise.all([
      loadFonts(`${assets}/media`),
      VectorInk.load(`${assets}/vector_ink`),
      bitmap(`${assets}/media/objects.png`),
      bitmap(`${assets}/media/hand-field.png`),
    ]);
    return new Film(assets, ink, atlas, field, enhanced);
  }

  constructor(assets, ink, atlas, field, enhanced = false) {
    this.assets = assets;
    this.ink = ink;
    const { frames, impacts } = choreography();
    this.objects = frames;
    this.impacts = impacts;
    this.flight = letterFlights();
    this.heroes = new Heroes(frames);
    this.stage = new ShaderStage(WIDTH, HEIGHT);
    for (const name of ['paper', 'signal', 'performance', 'hand', 'thermalCut']) {
      this.stage.define(name, shaders[name]);
    }
    // Translucent layers blend with the canvas under them inside the shader.
    for (const name of ['print', 'object', 'impact']) {
      this.stage.define(name, shaders[name], { blend: true });
    }
    this.stage.texture('atlas', atlas);
    this.stage.texture('field', field);
    this.painter = new Painter(WIDTH, HEIGHT);
    this.openingType = new Path2D(OPENING_TYPE);
    this.portraitFrame = -1;
    this.enhanced = enhanced;
    if (enhanced) {
      this.enhancer = new Enhancer(WIDTH, HEIGHT);
      this.base = document.createElement('canvas');
      this.base.width = WIDTH;
      this.base.height = HEIGHT;
      this.baseCtx = this.base.getContext('2d');
    }
  }

  static scene(frame) {
    return SCENES.find((s) => frame < s.end) || SCENES[SCENES.length - 1];
  }

  /** Load what a frame needs before drawing it: the portrait footage frame. */
  async prepare(frame) {
    const scene = Film.scene(frame);
    if (scene.kind !== 'portrait') return;
    const local = frame - scene.start;
    if (local === this.portraitFrame) return;
    const name = String(local).padStart(3, '0');
    this.stage.texture('portrait', await bitmap(`${this.assets}/portrait/${name}.png`));
    this.portraitFrame = local;
  }

  // Studio layers ----------------------------------------------------------------------

  background(c, s, mode, vignette) {
    this.stage.draw(c, 'paper', FULL, { uMode: mode, uVignette: vignette }, s);
  }

  signal(c, s) {
    const n = s.frame;
    const pose = n === 0 ? [1240, 540, 170, 670, 0, 0.42]
      : n === 1 ? [550, 540, 680, 660, 0.17, 0.42]
        : n === 2 ? [350, 540, 740, 950, -0.68, 0.38]
          : STAR[Math.min(n - 3, 37)];
    this.stage.draw(c, 'signal', FULL, {
      uPose: pose.slice(0, 4),
      uAngle: pose[4],
      uPower: pose[5],
    }, s);
  }

  print(c, s, strength) {
    this.stage.draw(c, 'print', FULL, { uStrength: strength }, s);
  }

  object(c, s, o) {
    const { rect, uniforms } = o.layer();
    if (rect[2] <= 0 || rect[3] <= 0) return;
    if (this.enhanced && s.shadows) {
      // A soft contact shadow on the paper; nearer objects throw it farther.
      const depth = 1250 / o.center[2];
      this.stage.drawShadowed(c, 'object', rect, { ...uniforms, uAtlas: 'atlas' }, s, {
        color: 'rgba(42, 28, 18, 0.30)', blur: 10 + 8 * depth, x: 7 * depth, y: 13 * depth,
      });
      return;
    }
    this.stage.draw(c, 'object', rect, { ...uniforms, uAtlas: 'atlas' }, s);
  }

  ring(c, s) {
    for (const o of this.objects[Math.min(s.global, 488)]) this.object(c, s, o);
  }

  performance(c, s) {
    this.stage.draw(c, 'performance', FULL, { uSource: 'portrait' }, s);
  }

  hand(c, s) {
    const [ax, ay, x, y, w, h] = HAND[Math.min(s.frame, 50)];
    this.stage.draw(c, 'hand', FULL, { uField: 'field', uAtlas: [ax, ay], uRect: [x, y, w, h] }, s);
  }

  // Shots ------------------------------------------------------------------------------

  /** Draw global frame `frame` (0..488) onto the 2D context `c`. */
  render(c, frame) {
    if (this.enhanced) {
      this.draw(this.baseCtx, frame);
      this.enhancer.render(c, this.base, this.look(frame));
      return;
    }
    this.draw(c, frame);
  }

  draw(c, frame) {
    const scene = Film.scene(frame);
    const local = frame - scene.start;
    const t = seconds(local);
    // `time`/`frame` are the iTime/iFrame uniforms: scene-local, like fframes' shaders.
    const paper = ['signal', 'ring', 'carousel', 'scatter', 'pulse0', 'pulse3'].includes(scene.kind);
    const s = { time: t, frame: local, global: frame, shadows: paper };
    const p = this.painter;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.filter = 'none';
    c.miterLimit = 4; // SVG's default stroke-miterlimit; the canvas default is 10
    c.fillStyle = '#000';
    c.fillRect(0, 0, WIDTH, HEIGHT);

    switch (scene.kind) {
      case 'question':
        this.background(c, s, 0, 0);
        if (local !== 0) drawOpening(p, c, local, t, this.openingType);
        drawQuestionInk(p, c, this.ink, t, frame);
        break;
      case 'signal': {
        const color = local === 0 ? '#f4eee0' : '#161616';
        this.signal(c, s);
        p.group(c, { opacity: animate(signalObjectsFade, t) }, (g) => this.ring(g, s));
        this.ink.draw(c, frame);
        const spans = textPaths('Inter 24pt', 54, 720, 554, QUESTION, {
          letterSpacing: -1.25,
          anchor: 'middle',
          spans: [[0, 7], [7, 10], [10, QUESTION.length]],
        });
        [color, local >= 39 ? '#fff4df' : color, color].forEach((fill, i) => {
          c.fillStyle = fill;
          c.fill(spans[i]);
        });
        break;
      }
      case 'portrait': {
        const copy = local <= 34 ? 'you don’t.' : local <= 38 ? 'you give' : local <= 42 ? 'you give it' : 'you give it fframes.';
        this.performance(c, s);
        this.ink.draw(c, frame);
        label(c, copy, 208, 554, 46, local >= 51 ? '#181714' : '#f3eee1');
        break;
      }
      case 'thermal':
        this.stage.draw(c, 'thermalCut', FULL, {}, s);
        p.group(c, { opacity: animate(thermalObjectsFade, t) }, (g) => this.ring(g, s));
        break;
      case 'ring':
      case 'carousel':
      case 'scatter':
        this.background(c, s, 0, 0.08);
        this.ring(c, s);
        drawImpacts(this.stage, c, this.impacts, frame, t, local);
        this.ink.draw(c, frame);
        if (scene.kind === 'scatter' && local > 23) label(c, 'from your mind', 720, 552, 32, '#1d1916', true);
        break;
      case 'code':
      case 'motion':
      case 'feeling':
        this.card(c, s, scene.kind);
        break;
      case 'hand':
        this.human(c, s);
        break;
      case 'pulse0':
      case 'pulse1':
      case 'pulse2':
      case 'pulse3':
        this.pulse(c, s, Number(scene.kind.slice(5)));
        break;
      case 'signature':
        this.signature(c, s);
        break;
      default:
        break;
    }

    const live = ['portrait', 'thermal', 'hand'].includes(scene.kind) || (scene.kind === 'question' && local === 0);
    const light = ['code', 'motion', 'feeling'].includes(scene.kind);
    if (!live) {
      drawDust(c, frame, light);
      this.print(c, s, 0.045);
    }
  }

  /** Grade settings for the enhanced version, per frame. */
  look(frame) {
    const scene = Film.scene(frame);
    const local = frame - scene.start;
    const index = SCENES.indexOf(scene);
    const dark = ['portrait', 'thermal', 'code', 'motion', 'feeling', 'hand', 'pulse1'].includes(scene.kind);
    const thermal = { portrait: 1, hand: 0.8, thermal: 0.6 }[scene.kind] || 0;
    const shocks = this.impacts
      .map((hit) => [hit.position[0], hit.position[1], frame - hit.at, 1])
      .filter(([, , age]) => age >= 0 && age < 12);
    let rays = [0, 0, 0, 0];
    if (scene.kind === 'signal') {
      const pose = local < 3 ? [[1240, 540], [550, 540], [350, 540]][local] : STAR[Math.min(local - 3, 37)];
      const ball = local >= 41 ? [[730, 530], [610, 550], [430, 540], [430, 540]][Math.min(local - 41, 3)] : null;
      rays = [...(ball || pose.slice(0, 2)), local < 3 ? 0.5 : 1.6, 0];
    }
    // A warm leak of light washes in on each hard cut and fades over a few frames.
    const leakStrength = index > 0 ? 0.42 * Math.exp(-local / 2.2) : 0;
    const seed = Math.sin(index * 12.9898) * 43758.5453;
    const side = seed - Math.floor(seed);
    return {
      time: frame / FPS,
      frame,
      threshold: dark ? 0.52 : 0.94,
      bloom: { hand: 0.55, portrait: 0.8 }[scene.kind] ?? (dark ? 0.9 : scene.kind === 'signal' ? 0.6 : 0.45),
      haze: thermal,
      shocks,
      rays,
      leak: [side < 0.5 ? -0.05 : 1.05, 0.25 + 0.5 * side, 0.55, leakStrength],
      leakColor: [1.0, 0.55, 0.28],
      weave: [Math.sin(frame * 1.7) * 0.22 + Math.sin(frame * 0.37) * 0.12, Math.cos(frame * 1.3) * 0.18],
      aberration: 0.0075,
      grain: dark ? 0.022 : 0.016,
      vignette: dark ? 0.16 : 0.1,
    };
  }

  card(c, s, card) {
    const pose = this.heroes.exposure(card, s.frame);
    this.background(c, s, 1, 0);
    this.ink.draw(c, s.global);
    // The other eleven tracks keep rotating off-screen; this is the selected track's pose.
    this.object(c, s, pose.object);
    this.painter.group(c, { opacity: pose.titleOpacity }, (g) => this.typeBlock(g, s.time, card));
  }

  typeBlock(c, t, card) {
    const block = typeBlock(t, card);
    const p = this.painter;
    p.group(c, { transform: block.titleTransform }, (g) => {
      label(g, block.copy, 800, 559, 112, '#f4efe4');
      g.fillStyle = '#ed3d27';
      g.fillRect(block.cursor.x, block.cursor.y, block.cursor.width, block.cursor.height);
    });
    p.group(c, { transform: block.subtitleTransform, opacity: block.subtitleOpacity }, (g) => {
      if (card === 'feeling') {
        text(g, { family: 'Instrument Serif', size: 35, x: 807, y: 617, copy: 'every frame matters.', fill: '#d4cabb' });
        g.strokeStyle = '#ed3d27';
        g.lineWidth = 2;
        g.stroke(new Path2D('M811 653 C905 641 970 662 1045 647'));
      } else if (card === 'code') {
        text(g, { family: 'JetBrains Mono', size: 23, x: 807, y: 611, copy: 'Rust + SVG', fill: '#bce788' });
      } else {
        text(g, { family: 'JetBrains Mono', size: 23, x: 807, y: 611, copy: 'timeline!', fill: '#c0a1ef' });
      }
    });
  }

  human(c, s) {
    if (s.frame === 0) {
      this.background(c, s, 1, 0);
      stackLight(c, this.painter);
      for (let i = 0; i < 12; i++) {
        const x = f(720 + f(cosf(f(i * f(0.55))) * 130));
        this.object(c, s, hero(i, x, 150 + i * 65, 170, f(i * f(0.13))));
      }
    } else {
      this.hand(c, s);
    }
    const copy = s.frame <= 2 ? 'from' : s.frame <= 5 ? 'from your' : 'from your mind';
    this.ink.draw(c, s.global);
    label(c, copy, 208, 554, 42, '#f1ecdf');
    this.painter.group(c, { opacity: animate(handCaption, s.time) }, (g) => {
      label(g, 'to every frame.', 1050, 554, 42, '#f1ecdf');
    });
  }

  pulse(c, s, index) {
    const mode = index === 1 ? 1 : index === 3 && s.frame < 3 ? 1 : index === 2 ? 2 : 0;
    const color = index === 0 ? '#27221c' : '#ede9df';
    const icons = [3, 0, 7, 4];
    this.background(c, s, mode, index === 3 ? 1.35 : 0.5);
    this.object(c, s, hero(icons[index], 720, 540, 370, f(s.global * f(0.13))));
    ['M', 'O', 'V', 'E'].slice(0, index + 1).forEach((ch, i) => {
      label(c, ch, 250 + i * 312, 552, 32, color, true);
    });
  }

  signature(c, s) {
    const p = this.painter;
    const t = s.time;
    const poses = this.flight[Math.min(s.frame, 75)];
    this.background(c, s, 0, 0.025);
    drawSignatureInk(p, c, this.ink, t, s.global, poses);
    p.group(c, { opacity: animate(orbitFade, t) }, (g) => {
      ['f', 'f', 'r', 'a', 'm', 'e', 's'].forEach((ch, i) => {
        const pose = poses[i];
        p.group(g, { transform: poseMatrix(pose) }, (g2) => text(g2, {
          family: 'Instrument Serif', size: 54, copy: ch, anchor: 'middle',
          fill: '#35221b', stroke: '#35221b', strokeWidth: 0.35,
        }));
      });
    });
    const word = { family: 'Instrument Serif', size: 194, y: 39, copy: 'fframes', anchor: 'middle', letterSpacing: -5 };
    const scale = animate(wordScale, t);
    // usvgr bounds the fade's layer by the scaled outlines, and the layer's origin shows in
    // the edges of the type on the frame where the fade ends at 0.99999994.
    const box = textBounds(word.family, word.size, 0, word.y, word.copy, word);
    const bounds = box.map((v, i) => (i % 2 ? f(540 + f(v * f(scale.sy))) : f(720 + f(v * f(scale.sx)))));
    p.group(c, { opacity: animate(wordFade, t), bounds }, (g) => {
      p.group(g, { transform: Transform.translate(720, 540) }, (g2) => {
        p.group(g2, { transform: scale }, (g3) => text(g3, { ...word, fill: '#24201b' }));
      });
      p.group(g, { opacity: animate(tagFade, t), transform: animate(tagSlide, t) }, (g2) => {
        text(g2, {
          family: 'JetBrains Mono', size: 19, x: 720, y: 643, copy: 'video, written in code.',
          anchor: 'middle', letterSpacing: 1, fill: '#4b4136',
        });
        g2.fillStyle = '#eb6c35';
        g2.fill(circlePath(720, 703, 4.5));
      });
    });
  }
}
