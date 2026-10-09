// "Light over time": a Helios promo built on the made-of-motion film. It keeps the film's
// edit, music and shots and tells the Helios story in them, then adds three things of its
// own: a running `t` that never resets, a grid of workers rendering other moments of the
// film at once, and a finale where the paper burns away into the brand's night and its sun.

import { animate, Easing, seconds, timeline } from './anim.js';
import { LETTERS } from './captures.js';
import { COPY, Film, FPS, FRAMES, HEIGHT, SCENES, WIDTH } from './film.js';
import { drawDust, VectorInk } from './ink.js';
import { circlePath, label, text } from './painter.js';
import { layout, loadFont } from './text.js';

const NAVY = '#060B18';
const GOLD = '#F0BB3B';
const BLUE = '#449DF0';

const finaleScene = SCENES.find((s) => s.kind === 'signature');
const gridScene = SCENES.find((s) => s.name === 'CarouselB');

// Shots on dark backgrounds, where the running time is drawn light.
const DARK = ['portrait', 'thermal', 'code', 'motion', 'feeling', 'hand', 'pulse1'];

const ease = {
  circOut: (x) => Math.sqrt(1 - (Math.min(Math.max(x, 0), 1) - 1) ** 2),
  cubicIn: (x) => Math.min(Math.max(x, 0), 1) ** 3,
  backOut: (x) => {
    const u = Math.min(Math.max(x, 0), 1) - 1;
    return 1 + 2.70158 * u ** 3 + 1.70158 * u ** 2;
  },
  inOut: (x) => {
    const u = Math.min(Math.max(x, 0), 1);
    return u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
  },
};
const mix = (a, b, t) => a + (b - a) * t;

// --- The finale's lockup: the Helios logo (docs/site/logo) at 2.2x ----------------------

const LOGO = 2.5;
const WORD = { family: 'Space Grotesk', size: 64 * LOGO, letterSpacing: -1.6 * LOGO };
const LETTER_COUNT = 6;

/** Sun centre, its radius, the wordmark's left edge and baseline, from the logo's geometry. */
function lockup() {
  const { width } = layout(WORD.family, WORD.size, 'HELIOS', WORD.letterSpacing);
  // The logo spans from the left ray's tip (x 8) to the end of the word (x 140 + width).
  const left = 720 - (132 * LOGO + width) / 2 - 8 * LOGO;
  const sun = [left + 64 * LOGO, 498];
  return { sun, radius: 24 * LOGO, textX: left + 140 * LOGO, baseline: sun[1] + 22 * LOGO, width };
}

// --- Shaders --------------------------------------------------------------------------

/** The paper burns away from the sun: night sky, ember front, letters lit by the sun. */
const DAWN = /* glsl */ `
uniform vec2 uSun;
uniform float uRadius;
uniform float uSeconds;
uniform float uSweep;
uniform float uFlare;
uniform sampler2D uLetters;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.), f.x), f.y);
}
float fbm(vec2 p) {
  float s = 0., a = .5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; }
  return s;
}
vec4 skMain(vec2 p) {
  vec2 at = uOrigin + p;
  vec3 paper = texelFetch(uDst, ivec2(at), 0).rgb;
  float letter = texelFetch(uLetters, ivec2(at), 0).a;
  vec2 d = at - uSun;
  float r = length(d);
  float angle = atan(d.y, d.x);
  // A wavering front: slow noise around the circle, finer noise across the paper.
  float front = uRadius + (fbm(vec2(angle * 2.6 + 4., uSeconds * .7)) - .5) * 110.
    + (fbm(at * .011 + vec2(0., uSeconds * .4)) - .5) * 46.;
  float x = r - front;
  float night = smoothstep(3., -3., x);

  vec3 sky = vec3(6., 11., 24.) / 255. + vec3(.012, .026, .055) * (1. - at.y / 1080.);
  float glow = exp(-r / 260.) * .5 + exp(-r / 85.) * .45;
  sky += vec3(.94, .73, .23) * glow * (.55 + .35 * uFlare);
  vec2 cell = floor(at / 3.);
  float star = step(.9982, h21(cell)) * (.35 + .65 * h21(cell + 7.)) * smoothstep(260., 640., r);
  sky += star * (.55 + .35 * sin(uSeconds * 2.7 + h21(cell + 3.) * 40.));

  // The paper browns ahead of the front, then catches.
  float scorch = exp(-max(x, 0.) / 60.);
  vec3 burnt = mix(paper, paper * vec3(.52, .38, .28), scorch * .9);
  vec3 c = mix(burnt, sky, night);

  // Letters: ink on the paper, the brand's blue in the night, warmer near the sun.
  vec3 blue = vec3(68., 157., 240.) / 255.;
  vec3 lit = mix(blue, vec3(.82, .9, 1.), exp(-r / 360.) * .35);
  float sweep = exp(-pow((at.x - uSweep + (at.y - 540.) * .32) / 46., 2.));
  lit = mix(lit, vec3(1.), sweep * .85);
  c = mix(c, mix(vec3(28., 24., 19.) / 255., lit, night), letter);

  float ember = exp(-pow(x / 8., 2.)) + .5 * exp(-pow(x / 30., 2.));
  vec3 fire = mix(vec3(1., .33, .07), vec3(1., .86, .5), exp(-pow(x / 5., 2.)));
  c += fire * ember * 1.25 * step(1., uRadius);
  return vec4(clamp(c, 0., 1.), 1.);
}
`;

// --- The worker grid: sixteen moments of the film rendered at once ----------------------

const COLS = 4;
const ROWS = 4;
const SOURCE = [1, 1];  // keeps playing the carousel the grid opens on
const TARGET = [2, 2];  // the Feeling card the grid closes into
const TILES = [
  30, 62, 100, 168,
  205, 'source', 241, 184,
  295, 316, 'target', 344,
  384, 399, 81, 155,
];

function tileRect(col, row) {
  const w = WIDTH / COLS;
  const h = HEIGHT / ROWS;
  return [col * w, row * h, w, h];
}

// --- Letter flights into the wordmark ----------------------------------------------------

/**
 * The reference's measured flight, replayed for six letters in independent phases, then
 * gathered into the wordmark after the last hit, at 0.25–0.63 s.
 */
function flights(targets, baseline) {
  const gather = timeline([{
    at: 0.25, end: 0.625, from: 0, to: 1, easing: Easing.cubicBezier(0.16, 1, 0.3, 1),
  }]);
  const path = (index, i) => {
    let phase = (index * (0.8 + i * 0.025) + i * 3.1) % 52;
    if (phase < 0) phase += 52;
    phase = phase <= 26 ? phase : 52 - phase;
    const sample = 3 + phase;
    const a = Math.floor(sample);
    const b = Math.min(a + 1, LETTERS.length - 1);
    const fr = sample - a;
    const [ax, ay] = LETTERS[a][i % 4];
    const [bx, by] = LETTERS[b][i % 4];
    let x = ax + (bx - ax) * fr;
    let y = ay + (by - ay) * fr;
    if (i >= 4) [x, y] = [1440 - x, 1080 - y];
    return [60 + Math.min(1440, Math.max(0, x)) * (1320 / 1440), 85 + Math.min(1080, Math.max(0, y)) * (910 / 1080)];
  };
  const angles = new Array(LETTER_COUNT).fill(0);
  return Array.from({ length: 76 }, (_, index) => {
    const g = animate(gather, index / FPS);
    return targets.map((tx, i) => {
      const [x, y] = path(index, i);
      const [px, py] = path(index - 0.5, i);
      const speed = Math.hypot(x - px, y - py) * 2;
      angles[i] += (i % 2 ? -1 : 1) * (speed * 0.34 + 3.1);
      const flying = (54 / WORD.size) * (1.05 + Math.min(speed / 170, 0.65));
      return {
        position: [mix(x, tx, g), mix(y, baseline, g)],
        angle: angles[i] * (1 - g),
        scale: mix(flying, 1, g),
        settled: g,
      };
    });
  });
}

// --- Copy -----------------------------------------------------------------------------

const QUESTION = 'how do you turn a web page into a film?';

export const PROMO_COPY = {
  question: QUESTION,
  highlight: [QUESTION.indexOf('web page'), QUESTION.indexOf('web page') + 'web page'.length],
  answer: ['you don’t.', 'you give', 'you give it', 'you give it time.'],
  scatter: 'from one page',
  scatterAt: [720, 760], // clear of the objects gathering in the middle
  hand: ['from', 'from one', 'from one page', 'to every frame.'],
  titles: null, // measured once the fonts are in (cursor after the word)
  subtitles: { code: '<canvas> · css · webgl', motion: 'window.renderAt(t)', feeling: 'every frame, exactly.' },
  pulse: ['T', 'I', 'M', 'E'],
};

export class Promo extends Film {
  static async load(assets = 'assets') {
    await loadFont('Space Grotesk', 'vendor/space-grotesk/SpaceGrotesk-Bold.ttf');
    return super.load(assets, { enhanced: true });
  }

  constructor(...args) {
    super(...args);
    this.copy = { ...PROMO_COPY, titles: this.measureTitles({ code: 'html.', motion: 'time.', feeling: 'light.' }) };
    this.stage.define('dawn', DAWN, { blend: true });
    this.lockup = lockup();
    const { textX, baseline } = this.lockup;
    const { clusters } = layout(WORD.family, WORD.size, 'HELIOS', WORD.letterSpacing);
    this.letterTargets = clusters.map((cl) => textX + cl.x + cl.advance / 2);
    this.letterFlights = flights(this.letterTargets, baseline);
    this.tile = document.createElement('canvas');
    this.tile.width = WIDTH;
    this.tile.height = HEIGHT;
    this.tileCtx = this.tile.getContext('2d');
    this.mask = document.createElement('canvas');
    this.mask.width = WIDTH;
    this.mask.height = HEIGHT;
    this.maskCtx = this.mask.getContext('2d');
  }

  /** On the "time." card the function is being called, with the film's actual t. */
  subtitle(card, frame) {
    if (card === 'motion') return `window.renderAt(${(frame / FPS).toFixed(3)})`;
    return super.subtitle(card, frame);
  }

  /** Card titles with the cursor as far after each word as the original's. */
  measureTitles(words) {
    const width = (copy) => layout('Inter 24pt', 112, copy, -1.25).width;
    const gaps = Object.values(COPY.titles).map(([copy, x]) => x - 800 - width(copy));
    const gap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return Object.fromEntries(Object.entries(words).map(([card, copy]) => [card, [copy, Math.round(800 + width(copy) + gap)]]));
  }

  async prepare(frame) {
    if (frame >= gridScene.start && frame < gridScene.end) {
      // The grid's one portrait tile needs its footage frame.
      const portrait = TILES.find((v) => typeof v === 'number' && Film.scene(v).kind === 'portrait');
      return super.prepare(portrait + frame - gridScene.start);
    }
    return super.prepare(frame);
  }

  render(c, frame) {
    this.drawFrame(this.baseCtx, frame);
    this.enhancer.render(c, this.base, this.look(frame));
    // The running time sits on top of the grade, crisp, like a broadcast overlay.
    this.hud(c, frame);
  }

  /** The film without the running time (a grid tile draws this too). */
  drawFrame(c, frame, { tile = false } = {}) {
    const scene = Film.scene(frame);
    if (scene === finaleScene) this.finale(c, frame);
    else if (scene === gridScene && !tile) this.grid(c, frame);
    else super.draw(c, frame);
    if (scene.kind === 'signal') this.sunRays(c, frame - scene.start);
  }

  // Global: the running time -------------------------------------------------------------

  hud(c, frame) {
    const scene = Film.scene(frame);
    // The grid's tiles each carry their own time instead.
    if (frame === 0 || scene === gridScene) return;
    const local = frame - scene.start;
    const finale = scene === finaleScene;
    const { sun } = this.lockup;
    const night = finale && burnFront(local) > Math.hypot(66 - sun[0], 1024 - sun[1]) + 40;
    const dark = DARK.includes(scene.kind) || night;
    // "time." lands on the portrait: the clock answers.
    const answered = scene.kind === 'portrait' && local >= 43;
    const t = frame / FPS;
    const copy = finale && local >= 40 ? `renderAt(${t.toFixed(3)})` : `t = ${t.toFixed(3).padStart(6, '0')}`;
    const ink = dark ? '#efe9dc' : '#2a241d';
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = answered ? 0.95 : 0.6;
    if (answered) {
      c.shadowColor = 'rgba(240, 187, 59, 0.7)';
      c.shadowBlur = 14;
    }
    sunGlyph(c, 66, 1024, 4.2, t * 0.6, answered || night ? GOLD : ink);
    text(c, { family: 'JetBrains Mono', size: 18, x: 84, y: 1030, copy, fill: answered ? GOLD : ink });
    // A hairline that fills over the whole film.
    c.globalAlpha *= 0.5;
    c.fillStyle = ink;
    c.fillRect(84, 1040, 150 * (frame / (FRAMES - 1)), 1.5);
    c.restore();
  }

  // Signal: the bloom that ends the shot already has rays ------------------------------

  sunRays(c, local) {
    if (local < 42 || local > 44) return;
    // The ball's centre and radius, as the signal shader moves them (a = 1 from frame 42).
    const towards = (v, to, w) => v.map((x, i) => mix(x, to[i], w));
    const b = Math.min(Math.max(local - 42, 0), 1);
    const e = Math.min(Math.max(local - 43, 0), 1);
    const centre = towards(towards([730, 530], [610, 550], b), [430, 540], e);
    const radius = towards(towards([470, 540], [365, 445], b), [200, 275], e);
    const r = (radius[0] + radius[1]) / 2;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.strokeStyle = 'rgba(255, 216, 128, 0.5)';
    c.lineCap = 'round';
    c.lineWidth = r * 0.085;
    const turn = (local - 42) * 0.09;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + turn;
      const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
      c.beginPath();
      c.moveTo(centre[0] + dx * r * 1.12, centre[1] + dy * r * 1.12);
      c.lineTo(centre[0] + dx * r * 1.4, centre[1] + dy * r * 1.4);
      c.stroke();
    }
    c.restore();
  }

  // The worker grid ----------------------------------------------------------------------

  grid(c, frame) {
    const local = frame - gridScene.start;
    // The camera: from the source tile out to the whole grid, then into the target tile.
    const whole = [0, 0, WIDTH, HEIGHT];
    const gutter = 5;
    const inset = ([x, y, w, h]) => [x + gutter, y + gutter, w - 2 * gutter, h - 2 * gutter];
    // Start and end exactly on a tile's picture, so the cuts around the grid are seamless.
    const from = inset(tileRect(...SOURCE));
    const to = inset(tileRect(...TARGET));
    const out = ease.inOut(local / 5);
    const inward = ease.inOut((local - 7) / 4);
    const lerpRect = (a, b, w) => {
      // Interpolate the scale in log space, so the zoom feels even.
      const s = Math.exp(mix(Math.log(a[2]), Math.log(b[2]), w));
      const k = (s - a[2]) / (b[2] - a[2] || 1);
      return [mix(a[0], b[0], k), mix(a[1], b[1], k), s, s * (HEIGHT / WIDTH)];
    };
    const view = local < 7 ? lerpRect(from, whole, out) : lerpRect(whole, to, inward);
    const sx = WIDTH / view[2];
    const sy = HEIGHT / view[3];
    const map = ([x, y, w, h]) => [(x - view[0]) * sx, (y - view[1]) * sy, w * sx, h * sy];

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = NAVY;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    TILES.forEach((entry, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const inner = map(inset(tileRect(col, row)));
      if (inner[0] > WIDTH || inner[1] > HEIGHT || inner[0] + inner[2] < 0 || inner[1] + inner[3] < 0) return;
      // Tiles further from the source wake up later.
      const delay = Math.hypot(col - SOURCE[0], row - SOURCE[1]) * 0.25;
      const awake = entry === 'source' ? 1 : ease.circOut((local + 0.5 - delay) / 1.5);
      if (awake <= 0) return;
      const source = entry === 'source' ? gridScene.start + local
        : entry === 'target' ? gridScene.end
          : entry + local;
      this.drawFrame(this.tileCtx, source, { tile: true });
      c.save();
      c.globalAlpha = awake;
      const grow = mix(0.86, 1, awake);
      const [ix, iy, iw, ih] = inner;
      const cx = ix + iw / 2;
      const cy = iy + ih / 2;
      c.imageSmoothingQuality = 'high';
      c.drawImage(this.tile, cx - (iw * grow) / 2, cy - (ih * grow) / 2, iw * grow, ih * grow);
      // Each tile is a worker with its own t.
      const t = `t = ${(source / FPS).toFixed(3).padStart(6, '0')}`;
      const fontSize = Math.max(11, 13 * (sx / 1));
      // Labels give way as the camera dives into the next shot.
      c.globalAlpha = awake * 0.85 * (1 - inward) * Math.min(1, local / 1.5 + (entry === 'source' ? 0 : 1));
      c.fillStyle = 'rgba(6, 11, 24, 0.72)';
      c.fillRect(ix + 8 * (sx / 1), iy + ih - 26 * sy, 108 * (fontSize / 13), 18 * (fontSize / 13));
      text(c, {
        family: 'JetBrains Mono', size: fontSize, x: ix + 14 * sx, y: iy + ih - 12.5 * sy,
        copy: t, fill: entry === 'source' || entry === 'target' ? GOLD : '#e9edf5',
      });
      c.restore();
    });

    // "any frame, any machine." lands one phrase at a time.
    const phrases = ['any frame,', 'any machine.'];
    const shown = phrases.filter((_, i) => local >= 2 + i * 1.5);
    if (shown.length && local < 9) {
      const copy = shown.join(' ');
      const fade = local < 8 ? 1 : 9 - local;
      const { width } = layout('Inter 24pt', 58, phrases.join(' '), -1.25);
      c.save();
      c.globalAlpha = fade;
      c.fillStyle = 'rgba(6, 11, 24, 0.86)';
      roundRect(c, 720 - width / 2 - 34, 486, width + 68, 100, 50);
      label(c, copy, 720 - width / 2, 557, 58, '#f4efe4');
      c.restore();
    }
  }

  // The finale -------------------------------------------------------------------------

  finale(c, frame) {
    const local = frame - finaleScene.start;
    const t = seconds(local);
    const s = { time: t, frame: local, global: frame, shadows: false };
    const poses = this.letterFlights[Math.min(local, 75)];
    const { sun, radius } = this.lockup;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.filter = 'none';
    c.miterLimit = 4;
    this.background(c, s, 0, 0.025);

    // The source's ink: black gestures leave first, the red letter marks follow the letters.
    const ink = this.ink.frame(Math.min(frame, 488));
    const capture = LETTERS[Math.min(Math.max(frame - 413, 0), LETTERS.length - 1)];
    const black = 1 - local / 8;
    if (black > 0) this.painter.group(c, { opacity: black }, (g) => VectorInk.fill(g, ink.base));
    const red = 1 - Math.max(0, local - 12) / 9;
    if (red > 0) {
      this.painter.group(c, { opacity: red }, (g) => {
        poses.forEach((pose, i) => {
          const [mx, my] = capture[i % 4];
          g.save();
          g.translate(pose.position[0] - mx, pose.position[1] - my);
          VectorInk.fill(g, ink.marks[i % 4]);
          g.restore();
        });
      });
    }
    drawDust(c, frame, false);
    this.print(c, s, 0.045);

    // The letters. Once the paper starts to burn they go through the dawn shader as a mask.
    const front = burnFront(local);
    const letters = (g, fill) => {
      'HELIOS'.split('').forEach((ch, i) => {
        const { position: [x, y], angle, scale } = poses[i];
        g.save();
        g.translate(x, y);
        g.rotate((angle * Math.PI) / 180);
        g.scale(scale, scale);
        text(g, { ...WORD, letterSpacing: 0, copy: ch, anchor: 'middle', fill });
        g.restore();
      });
    };
    if (front <= 0) {
      letters(c, '#1c1813');
    } else {
      this.maskCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.maskCtx.clearRect(0, 0, WIDTH, HEIGHT);
      letters(this.maskCtx, '#fff');
      this.stage.texture('letters', this.mask);
      const sweep = local < 60 ? -1e4 : mix(380, 1480, ease.inOut((local - 60) / 13));
      this.stage.draw(c, 'dawn', [0, 0, WIDTH, HEIGHT], {
        uSun: sun, uRadius: front, uSeconds: t, uSweep: sweep, uFlare: ease.inOut((local - 60) / 15),
        uLetters: 'letters',
      }, s);
      this.drawDustMotes(c, frame, front);
    }

    // The sun: the disc pops where the letters gathered, then its eight rays draw out.
    if (local >= 15) {
      const pop = ease.backOut((local - 15) / 6);
      c.save();
      c.fillStyle = GOLD;
      c.fill(circlePath(sun[0], sun[1], radius * pop));
      c.strokeStyle = GOLD;
      c.globalAlpha = 0.5;
      c.lineCap = 'round';
      c.lineWidth = 6 * LOGO;
      const spin = local > 30 ? (local - 30) * 0.0025 : 0;
      for (let i = 0; i < 8; i++) {
        const grow = ease.circOut((local - (19 + i * 1.4)) / 4);
        if (grow <= 0) continue;
        const angle = (i * Math.PI) / 4 + spin;
        const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
        const r0 = 40 * LOGO;
        const r1 = r0 + 16 * LOGO * grow;
        c.beginPath();
        c.moveTo(sun[0] + dx * r0, sun[1] + dy * r0);
        c.lineTo(sun[0] + dx * r1, sun[1] + dy * r1);
        c.stroke();
      }
      c.restore();
    }

    // "video is light over time." types itself out under the word.
    if (local >= 34) {
      const line = 'video is light over time.';
      const typed = Math.min(line.length, Math.floor((local - 34) * 1.5));
      const { width } = layout('JetBrains Mono', 32, line, 0.5);
      const x = 720 - width / 2;
      if (typed > 0) text(c, { family: 'JetBrains Mono', size: 32, x, y: 690, copy: line.slice(0, typed), letterSpacing: 0.5, fill: '#b8c7de' });
      const advance = width / line.length;
      if (Math.floor(local / 3) % 2 === 0 || typed < line.length) {
        c.fillStyle = GOLD;
        c.fillRect(x + advance * typed + 3, 665, 16, 32);
      }
    }
    this.callToAction(c, local);
  }

  /** The address, last, quietly under the tagline. */
  callToAction(c, local) {
    const fade = ease.inOut((local - 55) / 8);
    if (fade <= 0) return;
    const copy = 'github.com/BintzGavin/helios';
    const { width } = layout('JetBrains Mono', 21, copy, 0.5);
    c.save();
    c.globalAlpha = fade * 0.75;
    text(c, { family: 'JetBrains Mono', size: 21, x: 720 - width / 2, y: 750 + 8 * (1 - fade), copy, letterSpacing: 0.5, fill: '#7f93b3' });
    c.restore();
  }

  /** Motes in the night that catch the sun, inside the burnt-away region. */
  drawDustMotes(c, frame, front) {
    const t = frame / FPS;
    const { sun } = this.lockup;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const hx = fract(Math.sin(i * 91.7) * 43758.5453);
      const hy = fract(Math.sin(i * 47.3) * 24634.6345);
      const speed = 14 + 30 * fract(Math.sin(i * 13.1) * 9631.3);
      const x = 60 + hx * 1320 + Math.sin(t * 0.9 + i) * 14;
      const y = 1080 - ((hy * 1080 + t * speed) % 1080);
      const r = Math.hypot(x - sun[0], y - sun[1]);
      if (r > front - 40) continue;
      const warmth = Math.exp(-r / 520);
      c.globalAlpha = 0.25 + 0.6 * warmth;
      c.fillStyle = `rgb(255, ${Math.round(190 + 50 * warmth)}, ${Math.round(110 + 60 * warmth)})`;
      c.fill(circlePath(x, y, 0.8 + 1.7 * fract(hx * 7.3)));
    }
    c.restore();
  }

  // Grade --------------------------------------------------------------------------------

  look(frame) {
    const look = super.look(frame);
    const scene = Film.scene(frame);
    const local = frame - scene.start;
    if (scene === gridScene) {
      return { ...look, shocks: [], bloom: 0.35, threshold: 0.8, leak: [...look.leak.slice(0, 3), 0], vignette: 0.12 };
    }
    if (scene === finaleScene) {
      const night = local >= 20;
      const { sun } = this.lockup;
      const flare = ease.inOut((local - 60) / 15);
      return {
        ...look,
        threshold: night ? 0.5 : 0.94,
        bloom: night ? 0.75 + 0.5 * flare : 0.45,
        // Warm light only: the blue letters shouldn't streak.
        rays: local >= 16 ? [sun[0], sun[1], 0.9 + 1.1 * flare, 1] : [0, 0, 0, 0],
        grain: night ? 0.02 : 0.016,
        vignette: night ? 0.2 : 0.1,
        zoom: 1 + 0.04 * ease.inOut((local - 46) / 29),
      };
    }
    return look;
  }
}

/** How far the burn has spread from the sun, local frame `n` of the finale. */
function burnFront(n) {
  return n < 16 ? 0 : 1500 * ease.circOut((n - 16) / 24);
}

function fract(x) {
  return x - Math.floor(x);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

/** The Helios mark, small: a disc and eight rays, turned by `angle`. */
function sunGlyph(c, x, y, r, angle, color) {
  c.save();
  c.fillStyle = color;
  c.fill(circlePath(x, y, r));
  c.strokeStyle = color;
  c.lineCap = 'round';
  c.lineWidth = r * 0.36;
  c.globalAlpha *= 0.6;
  for (let i = 0; i < 8; i++) {
    const a = angle + (i * Math.PI) / 4;
    c.beginPath();
    c.moveTo(x + Math.cos(a) * r * 1.65, y + Math.sin(a) * r * 1.65);
    c.lineTo(x + Math.cos(a) * r * 2.3, y + Math.sin(a) * r * 2.3);
    c.stroke();
  }
  c.restore();
}

export { FPS, FRAMES };
