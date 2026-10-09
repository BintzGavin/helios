// "Light Over Time": a Helios promo. It borrows only the soundtrack's timing from the film
// next door; every image is its own: type written in light, a prism, a page that comes alive
// when time runs, pages orbiting a sun, glass objects, a tunnel of frames and a sunrise.
// Like every Helios page, a frame is a pure function of its time.

import { Enhancer } from '../enhance.js';
import { ShaderStage } from '../gl.js';
import { circlePath, Painter, text } from '../painter.js';
import { layout, loadFont, loadFonts, textContours, textPaths } from '../text.js';
import { contoursLength, drawLight, drawSpark } from './light.js';
import { drawBrowser, drawPage, PAGE_KINDS, UI } from './pages.js';
import { GLASS, PRISM, SKY, SUN } from './shaders.js';

export const WIDTH = 1440;
export const HEIGHT = 1080;
export const FPS = 24;
export const FRAMES = 489;
const FULL = [0, 0, WIDTH, HEIGHT];

// Scene boundaries (end exclusive) on the soundtrack's hits.
const EDIT = [
  ['write', 48], ['prism', 93], ['page', 153], ['flash', 157], ['orbitA', 200],
  ['html', 220], ['orbitB', 237], ['time', 253], ['grid', 265], ['light', 286],
  ['orbitC', 302], ['burst', 331], ['frames', 382],
  ['pulseT', 389], ['pulseI', 397], ['pulseM', 403], ['pulseE', 413], ['finale', 489],
];
export const SCENES = EDIT.map(([name, end], i) => ({ name, start: i ? EDIT[i - 1][1] : 0, end }));
const sceneOf = (frame) => SCENES.find((s) => frame < s.end) || SCENES[SCENES.length - 1];
const named = (name) => SCENES.find((s) => s.name === name);

const GOLD = UI.gold;
const BLUE = UI.blue;
const NAVY = UI.navy;
const CREAM = '#F4EFE4';

const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const mix = (a, b, t) => a + (b - a) * t;
const ease = {
  circOut: (x) => Math.sqrt(1 - (clamp01(x) - 1) ** 2),
  cubicOut: (x) => 1 - (1 - clamp01(x)) ** 3,
  cubicIn: (x) => clamp01(x) ** 3,
  inOut: (x) => {
    const u = clamp01(x);
    return u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2;
  },
  backOut: (x) => {
    const u = clamp01(x) - 1;
    return 1 + 2.70158 * u ** 3 + 1.70158 * u ** 2;
  },
};
const fract = (x) => x - Math.floor(x);
const rotate = ([x, y], a) => [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];

/** The prism shader's rainbow, for the labels that sit in its bands. */
function spectrum(x) {
  const c = [Math.abs(x * 6 - 3) - 1, 2 - Math.abs(x * 6 - 2), 2 - Math.abs(x * 6 - 4)].map(clamp01);
  return c.map((v) => Math.round(255 * v * v * (3 - 2 * v)));
}

// --- Copy -----------------------------------------------------------------------------

const QUESTION = 'how do you turn a web page into a film?';
const ANSWER = ['you don’t.', 'you give', 'you give it', 'you give it time.'];
const BANDS = ['html', 'css', 'svg', 'canvas', 'webgl', 'video'];
const FAN = 560; // how far the spectrum reaches before its labels
const HEROES = {
  html: { shape: 0, title: 'html.', sub: '<canvas> · css · webgl', color: UI.mint, glow: '240, 187, 59', tint: [0.85, 0.95, 1.2] },
  time: { shape: 1, title: 'time.', color: UI.violet, glow: '68, 157, 240', tint: [0.9, 1, 1.25] },
  light: { shape: 2, title: 'light.', sub: 'every frame, exactly.', glow: '155, 123, 255', tint: [1.1, 1, 1.2] },
};
const PULSES = [
  { letter: 'T', bg: GOLD, edge: '#C48A17', shape: 3, ink: NAVY },
  { letter: 'I', bg: NAVY, edge: '#02040A', shape: 0, ink: CREAM },
  { letter: 'M', bg: CREAM, edge: '#CFC6B4', shape: 2, ink: NAVY },
  { letter: 'E', bg: BLUE, edge: '#1F5FA8', shape: 1, ink: CREAM },
];

// --- The lockup: the Helios logo (docs/site/logo) at 2.5x -------------------------------

const LOGO = 2.5;
const WORD = { family: 'Space Grotesk', size: 64 * LOGO, letterSpacing: -1.6 * LOGO };

function lockup() {
  const { width, clusters } = layout(WORD.family, WORD.size, 'HELIOS', WORD.letterSpacing);
  const left = 720 - (132 * LOGO + width) / 2 - 8 * LOGO;
  const sun = [left + 64 * LOGO, 498];
  const textX = left + 140 * LOGO;
  const baseline = sun[1] + 22 * LOGO;
  return { sun, radius: 24 * LOGO, textX, baseline, targets: clusters.map((cl) => textX + cl.x + cl.advance / 2) };
}

// --- Orbits ---------------------------------------------------------------------------

const CAMERAS = {
  orbitA: { e: 0.3, R: 500, f: 1700, cx: 720, cy: 560, zoom: 1 },
  orbitB: { e: 0.11, R: 560, f: 1500, cx: 720, cy: 600, zoom: 1.22 },
  orbitC: { e: 0.82, R: 470, f: 1700, cx: 720, cy: 540, zoom: 1 },
};

// --- The worker grid ----------------------------------------------------------------------

const COLS = 4;
const ROWS = 4;
const SOURCE = [1, 1];
const TARGET = [2, 2];
const TILES = [
  20, 62, 84, 138,
  170, 'source', 210, 228,
  296, 312, 'target', 350,
  366, 386, 398, 406,
];
const tileRect = (col, row) => [col * (WIDTH / COLS), row * (HEIGHT / ROWS), WIDTH / COLS, HEIGHT / ROWS];

export class Promo {
  static async load(assets = 'assets') {
    await Promise.all([
      loadFonts(`${assets}/media`),
      loadFont('Space Grotesk', 'vendor/space-grotesk/SpaceGrotesk-Bold.ttf'),
    ]);
    return new Promo();
  }

  constructor() {
    this.stage = new ShaderStage(WIDTH, HEIGHT);
    this.stage.define('sun', SUN, { blend: true });
    this.stage.define('glass', GLASS, { blend: true });
    this.stage.define('prism', PRISM);
    this.stage.define('sky', SKY);
    this.painter = new Painter(WIDTH, HEIGHT);
    this.enhancer = new Enhancer(WIDTH, HEIGHT);
    this.base = this.canvas();
    this.tile = this.canvas();
    this.lock = lockup();

    // The opening: "how" written huge, then shrunk into the start of the question.
    const serif = 'Instrument Serif';
    const bigWidth = layout(serif, 360, 'how').width;
    const lineWidth = layout(serif, 72, QUESTION).width;
    const start = 720 - lineWidth / 2;
    this.write = {
      big: textContours(serif, 360, 720, 640, 'how', { anchor: 'middle', steps: 10 }),
      rest: textContours(serif, 72, start + layout(serif, 72, 'how').width, 560, QUESTION.slice(3), { steps: 6 }),
      k: 72 / 360,
      tx: start - (720 - bigWidth / 2) * (72 / 360),
      ty: 560 - 640 * (72 / 360),
    };
    this.write.bigLength = contoursLength(this.write.big);
    this.write.restLength = contoursLength(this.write.rest);
  }

  canvas() {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    return { canvas, ctx: canvas.getContext('2d') };
  }

  async prepare() {}

  render(c, frame) {
    this.drawFrame(this.base.ctx, frame);
    this.enhancer.render(c, this.base.canvas, this.look(frame));
    this.hud(c, frame);
  }

  /** One frame of the film, without the running time (a grid tile draws this too). */
  drawFrame(c, frame, { tile = false } = {}) {
    const scene = sceneOf(frame);
    const n = frame - scene.start;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.shadowBlur = 0;
    c.fillStyle = NAVY;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    const name = scene.name;
    if (name === 'write') this.drawWrite(c, n);
    else if (name === 'prism') this.drawPrism(c, frame, n);
    else if (name === 'page') this.drawPageShot(c, frame, n);
    else if (name === 'flash') this.drawFlash(c, frame, n);
    else if (name.startsWith('orbit')) this.drawOrbit(c, frame, CAMERAS[name]);
    else if (HEROES[name]) this.drawHero(c, frame, name, n);
    else if (name === 'grid') {
      if (tile) this.drawHero(c, frame, 'time', 16 + n);
      else this.drawGrid(c, frame, n);
    } else if (name === 'burst') this.drawBurst(c, frame, n);
    else if (name === 'frames') this.drawFrames(c, frame, n);
    else if (name.startsWith('pulse')) this.drawPulse(c, frame, SCENES.indexOf(scene) - SCENES.indexOf(named('pulseT')), n);
    else if (name === 'finale') this.drawFinale(c, frame, n);
  }

  // Global: drifting motes and the running time -------------------------------------------

  motes(c, frame, { color = '255, 230, 170', alpha = 1, count = 60 } = {}) {
    const t = frame / FPS;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      const depth = 0.25 + 0.75 * fract(Math.sin(i * 13.1) * 9631.3);
      const x = fract(fract(Math.sin(i * 91.7) * 43758.5) + t * 0.006 * depth) * WIDTH;
      const y = fract(Math.sin(i * 47.3) * 24634.6) * HEIGHT + Math.sin(t * 0.6 + i) * 18 * depth;
      c.globalAlpha = alpha * (0.1 + 0.32 * depth) * (0.7 + 0.3 * Math.sin(t * 2 + i * 3));
      c.fillStyle = `rgb(${color})`;
      c.fill(circlePath(x, y, 0.6 + 1.5 * depth));
    }
    c.restore();
  }

  hud(c, frame) {
    const scene = sceneOf(frame);
    if (frame === 0 || scene.name === 'grid') return;
    const n = frame - scene.start;
    const light = scene.name === 'pulseT' || scene.name === 'pulseM' || (scene.name === 'flash' && n < 2);
    const answered = scene.name === 'page' && n >= 43;
    const finale = scene.name === 'finale';
    const t = frame / FPS;
    const copy = finale && n >= 40 ? `renderAt(${t.toFixed(3)})` : `t = ${t.toFixed(3).padStart(6, '0')}`;
    const ink = light ? '#2a241d' : '#efe9dc';
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = answered ? 0.95 : 0.6;
    if (answered) {
      c.shadowColor = 'rgba(240, 187, 59, 0.7)';
      c.shadowBlur = 14;
    }
    sunGlyph(c, 66, 1024, 4.2, t * 0.6, answered || finale ? GOLD : ink);
    text(c, { family: 'JetBrains Mono', size: 18, x: 84, y: 1030, copy, fill: answered ? GOLD : ink });
    c.globalAlpha *= 0.5;
    c.fillStyle = ink;
    c.fillRect(84, 1040, 150 * (frame / (FRAMES - 1)), 1.5);
    c.restore();
  }

  // 0–2 s: the question, written in light -------------------------------------------------

  drawWrite(c, n) {
    const w = this.write;
    const glowAt = (p) => {
      if (!p) return;
      const g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], 520);
      g.addColorStop(0, 'rgba(240, 187, 59, 0.10)');
      g.addColorStop(1, 'rgba(240, 187, 59, 0)');
      c.fillStyle = g;
      c.fillRect(0, 0, WIDTH, HEIGHT);
    };
    // "how", huge, then shrinking into place at the start of the line.
    const shrink = ease.inOut((n - 14) / 6);
    const scale = mix(1, w.k, shrink);
    const fill = ease.inOut((n - 40) / 5);
    const lift = ease.inOut((n - 42) / 5);
    // At the end the whole line rises to the top, where the next shot keeps it.
    const up = (x, y) => [mix(x, 720 + (x - 720) * (44 / 72), lift), mix(y, 170 + (y - 560) * (44 / 72), lift)];
    const lineTransform = () => {
      const s = mix(1, 44 / 72, lift);
      const [ox, oy] = up(0, 0);
      return [s, ox, oy];
    };
    let head = null;
    const [ls, lx, ly] = lineTransform();
    c.save();
    c.setTransform(scale * ls, 0, 0, scale * ls, (w.tx * shrink) * ls + lx, (w.ty * shrink) * ls + ly);
    const reveal = ease.inOut(n / 14) * w.bigLength;
    if (n === 0) head = w.big[0][0];
    else head = drawLight(c, w.big, reveal, { width: 4.5 / (scale * ls), blur: 18, hot: 260 / scale, alpha: 1 - fill });
    c.restore();
    let restHead = null;
    if (n >= 20) {
      c.save();
      c.setTransform(ls, 0, 0, ls, lx, ly);
      restHead = drawLight(c, w.rest, ease.inOut((n - 20) / 21) * w.restLength, { width: 2.2 / ls, blur: 12, hot: 120, alpha: 1 - fill });
      c.restore();
    }
    const spark = n < 41 ? (restHead || head) : null;
    if (spark && n < 41) {
      const p = n >= 20 && restHead ? [restHead[0] * ls + lx, restHead[1] * ls + ly]
        : [spark[0] * scale * ls + w.tx * shrink * ls + lx, spark[1] * scale * ls + w.ty * shrink * ls + ly];
      glowAt(p);
      drawSpark(c, p, n === 0 ? 0.6 : 1);
    }
    if (fill > 0) {
      c.save();
      c.setTransform(ls, 0, 0, ls, lx, ly);
      c.globalAlpha = fill;
      const [path] = textPaths('Instrument Serif', 72, 720, 560, QUESTION, { anchor: 'middle' });
      c.fillStyle = CREAM;
      c.fill(path);
      c.restore();
    }
    this.motes(c, n, { alpha: 0.6 });
  }

  // 2–3.9 s: white light through a prism, into the colours of the web ---------------------

  prismGeometry(n) {
    const center = [690, 560];
    const side = 330;
    const rot = -0.06 + 0.035 * Math.sin((n / FPS) * 1.3);
    const h = side * 0.8660254;
    const at = (v) => {
      const [x, y] = rotate(v, rot);
      return [center[0] + x, center[1] + y];
    };
    const A = at([0, (-h * 2) / 3]);
    const B = at([-side / 2, h / 3]);
    const C = at([side / 2, h / 3]);
    const inP = [mix(A[0], B[0], 0.55), mix(A[1], B[1], 0.55)];
    const outP = [mix(A[0], C[0], 0.55), mix(A[1], C[1], 0.55)];
    const len = Math.hypot(outP[0] - inP[0], outP[1] - inP[1]);
    const dir = rotate([(outP[0] - inP[0]) / len, (outP[1] - inP[1]) / len], 0.27);
    return { center, side, rot, inP, outP, dir, source: [-20, 690] };
  }

  drawPrism(c, frame, n) {
    const g = this.prismGeometry(n);
    const gold = ease.inOut((n - 37) / 6);
    const spread = 0.25 * ease.circOut((n - 7) / 7) * (1 - 0.92 * gold);
    this.stage.draw(c, 'prism', FULL, {
      uCenter: g.center, uSide: g.side, uRot: g.rot, uSpread: Math.max(spread, 0.002),
      uBeam: ease.inOut(n / 8) * 1.25, uGold: gold, uSource: g.source, uDir: g.dir,
      uLength: FAN + 1400 * gold,
    }, { time: frame / FPS });
    // Each band of the spectrum is one of the web's materials.
    BANDS.forEach((band, k) => {
      const show = clamp01((n - (12 + 3.5 * k)) / 3) * (1 - gold);
      if (show <= 0) return;
      const u = (k + 0.5) / BANDS.length;
      const d = rotate(g.dir, (u - 0.5) * 2 * spread);
      const [x, y] = [g.outP[0] + d[0] * (FAN - 40), g.outP[1] + d[1] * (FAN - 40)];
      const [r, gg, b] = spectrum(1 - u);
      c.save();
      c.globalAlpha = show;
      text(c, { family: 'JetBrains Mono', size: 26, x: x + 16, y: y + 9 + 6 * (1 - show), copy: band, fill: `rgb(${r}, ${gg}, ${b})` });
      c.restore();
    });
    c.save();
    c.globalAlpha = 0.92;
    const [path] = textPaths('Instrument Serif', 44, 720, 170, QUESTION, { anchor: 'middle' });
    c.fillStyle = CREAM;
    c.fill(path);
    c.restore();
    this.motes(c, frame, { alpha: 0.5 });
    if (n >= 42) {
      c.fillStyle = `rgba(255, 246, 226, ${[0.15, 0.4, 0.75][n - 42]})`;
      c.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  // 3.9–6.4 s: a page that only moves once it is given time -------------------------------

  drawPageShot(c, frame, n) {
    const live = n >= 43;
    const u = live ? ((n - 43) / FPS) * 1.4 + 0.05 : 0;
    vignette(c, '#0B1430', NAVY);
    const glow = c.createRadialGradient(980, 540, 0, 980, 540, 620);
    glow.addColorStop(0, `rgba(240, 187, 59, ${live ? 0.16 : 0.07})`);
    glow.addColorStop(1, 'rgba(240, 187, 59, 0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    this.motes(c, frame, { alpha: 0.45 });

    const appear = ease.circOut(n / 6);
    const [x, y, w] = [650 + 40 * (1 - appear), 318, 660];
    c.save();
    // A slow push-in: the page is frozen, the camera isn't.
    const push = 1 + 0.06 * ease.inOut(n / 48);
    c.translate(x + w / 2, y + 226);
    c.scale(push, push);
    c.translate(-(x + w / 2), -(y + 226));
    c.globalAlpha = appear;
    drawBrowser(c, x, y, w, 0, u, { live, trails: 8, exposure: 0.4 });
    if (!live) {
      // Paused: the page is there, but nothing moves.
      const s = w / 640;
      c.fillStyle = 'rgba(6, 11, 24, 0.38)';
      c.beginPath();
      c.roundRect(x, y + 44 * s, w, 396 * s, [0, 0, 18 * s, 18 * s]);
      c.fill();
      c.fillStyle = 'rgba(232, 238, 248, 0.55)';
      c.beginPath();
      c.roundRect(x + w / 2 - 22, y + 250 * s - 30, 14, 60, 5);
      c.roundRect(x + w / 2 + 8, y + 250 * s - 30, 14, 60, 5);
      c.fill();
    } else {
      // Time runs: a band of gold light sweeps the window.
      const sweep = ease.inOut((n - 43) / 10);
      if (sweep > 0 && sweep < 1) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const sx = mix(x - 200, x + w + 200, sweep);
        const band = c.createLinearGradient(sx - 120, 0, sx + 120, 0);
        band.addColorStop(0, 'rgba(240, 187, 59, 0)');
        band.addColorStop(0.5, 'rgba(255, 220, 140, 0.35)');
        band.addColorStop(1, 'rgba(240, 187, 59, 0)');
        c.fillStyle = band;
        c.beginPath();
        c.roundRect(x, y, w, 440 * (w / 640), 18);
        c.fill();
        c.restore();
      }
    }
    c.restore();
    const copy = ANSWER[n <= 34 ? 0 : n <= 38 ? 1 : n <= 42 ? 2 : 3];
    text(c, { family: 'Space Grotesk', size: 50, x: 130, y: 572, copy, letterSpacing: -1, fill: CREAM });
    if (n >= 57) {
      c.fillStyle = `rgba(255, 246, 226, ${[0.2, 0.45, 0.75][n - 57]})`;
      c.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  drawFlash(c, frame, n) {
    if (n === 0) {
      c.fillStyle = '#FFF6E2';
      c.fillRect(0, 0, WIDTH, HEIGHT);
      return;
    }
    if (n === 1) {
      c.fillStyle = GOLD;
      c.fillRect(0, 0, WIDTH, HEIGHT);
      return;
    }
    this.drawOrbit(c, frame, CAMERAS.orbitA);
    c.fillStyle = `rgba(255, 240, 205, ${n === 2 ? 0.5 : 0.22})`;
    c.fillRect(0, 0, WIDTH, HEIGHT);
  }

  // Orbits: twelve pages around the sun ---------------------------------------------------

  /** Card poses for camera `cam` at time `t`; `burst` 0..1 throws them out at the camera. */
  orbitCards(cam, t, burst = 0) {
    const R = cam.R + 2600 * burst;
    return PAGE_KINDS.map((kind, i) => {
      const theta = (i * Math.PI * 2) / 12 + t * 0.85 + burst * 1.2;
      const x = R * Math.cos(theta);
      const z = R * Math.sin(theta);
      const zc = z * Math.cos(cam.e) + 900 * burst;
      const s = (cam.f / Math.max(cam.f - zc, 120)) * cam.zoom;
      return {
        kind, i, theta, zc, s,
        x: cam.cx + x * s,
        y: cam.cy + z * Math.sin(cam.e) * s,
        // Cards face away from the sun: near ones show their page, backlit; far ones
        // show their backs, lit warm by the sun.
        front: Math.sin(theta) > 0,
        width: Math.max(0.06, Math.abs(Math.sin(theta))),
      };
    }).sort((a, b) => a.zc - b.zc);
  }

  drawCard(c, card, t, cam, alpha = 1) {
    const { x, y, s, width, front, kind, i } = card;
    if (x < -400 || x > WIDTH + 400 || y < -400 || y > HEIGHT + 400) return;
    const toSun = Math.hypot(x - cam.cx, y - cam.cy);
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    c.scale(width * s, s);
    const near = Math.exp(-toSun / 380);
    c.beginPath();
    c.roundRect(-100, -67, 200, 134, 11);
    if (front) {
      drawPage(c, kind, -100, -67, 200, 134, t + i * 0.7);
      c.fillStyle = `rgba(6, 11, 24, ${0.12 + 0.3 * near})`;
      c.fill();
      c.strokeStyle = `rgba(255, 214, 130, ${0.2 + 0.7 * near})`;
      c.lineWidth = 2 / s;
      c.stroke();
    } else {
      const lit = c.createLinearGradient(0, -67, 0, 67);
      lit.addColorStop(0, '#6B4A1C');
      lit.addColorStop(1, '#2A1C0C');
      c.fillStyle = lit;
      c.fill();
      c.strokeStyle = 'rgba(255, 220, 150, 0.7)';
      c.lineWidth = 1.5 / s;
      c.stroke();
    }
    c.restore();
  }

  drawOrbit(c, frame, base, burst = 0, sunScale = 1, sunGlow = 1.1) {
    const t = frame / FPS;
    // The camera drifts: a little higher and lower, a little closer and further.
    const cam = { ...base, e: base.e + 0.05 * Math.sin(t * 0.9), zoom: base.zoom * (1 + 0.035 * Math.sin(t * 0.6 + 1)) };
    vignette(c, '#0D1838', NAVY, cam.cx, cam.cy);
    this.motes(c, frame, { alpha: 0.55 });
    const cards = this.orbitCards(cam, t, burst);
    for (const card of cards) if (card.zc < 0) this.drawCard(c, card, t, cam);
    const r = 92 * cam.zoom * sunScale;
    const box = Math.max(r * 7.5, 40);
    this.stage.draw(c, 'sun', [cam.cx - box / 2, cam.cy - box / 2, box, box], { uRadius: r, uGlow: sunGlow }, { time: t });
    for (const card of cards) if (card.zc >= 0) this.drawCard(c, card, t, cam);
  }

  // The glass heroes ----------------------------------------------------------------------

  drawHero(c, frame, name, n) {
    const hero = HEROES[name];
    const t = frame / FPS;
    vignette(c, '#0C1530', '#03050C', 430, 540);
    const glow = c.createRadialGradient(430, 540, 0, 430, 540, 520);
    glow.addColorStop(0, `rgba(${hero.glow}, 0.24)`);
    glow.addColorStop(1, `rgba(${hero.glow}, 0)`);
    c.fillStyle = glow;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    this.motes(c, frame, { alpha: 0.4 });
    const enter = ease.circOut(n / 7);
    this.stage.draw(c, 'glass', [110, 220, 640, 640], {
      uShape: hero.shape,
      uRot: [0.16 + 0.1 * Math.sin(t * 0.7), 0.5 * Math.sin(t * 0.9 + 0.8), 0.05 * Math.sin(t * 1.1)],
      uHand: 1.4 - t * 2.4,
      uKey: [1, 0.78, 0.35],
      uRim: [0.27, 0.62, 0.94],
      uTint: hero.tint,
      uZoom: mix(0.8, 1, enter),
    }, { time: t });

    const title = ease.circOut((n - 1) / 6);
    const tx = 800 + 40 * (1 - title);
    c.save();
    c.globalAlpha = title;
    text(c, { family: 'Space Grotesk', size: 124, x: tx, y: 590, copy: hero.title, letterSpacing: -3, fill: CREAM });
    const width = layout('Space Grotesk', 124, hero.title, -3).width;
    if (Math.floor(n / 4) % 2 === 0) {
      c.fillStyle = GOLD;
      c.fillRect(tx + width + 16, 498, 9, 100);
    }
    const sub = ease.inOut((n - 4) / 6);
    c.globalAlpha = title * sub;
    if (name === 'light') {
      text(c, { family: 'Instrument Serif', size: 40, x: tx + 6, y: 652, copy: hero.sub, fill: '#DCD4C4' });
      const draw = ease.inOut((n - 7) / 8);
      c.strokeStyle = GOLD;
      c.lineWidth = 2.5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(tx + 10, 670);
      c.quadraticCurveTo(tx + 150, 660, tx + 10 + 300 * draw, 668 - 4 * draw);
      if (draw > 0) c.stroke();
    } else {
      const copy = name === 'time' ? `window.renderAt(${t.toFixed(3)})` : hero.sub;
      text(c, { family: 'JetBrains Mono', size: 25, x: tx + 6, y: 646, copy, fill: hero.color });
    }
    c.restore();
  }

  // The worker grid: sixteen moments of the film at once ---------------------------------

  drawGrid(c, frame, n) {
    const whole = [0, 0, WIDTH, HEIGHT];
    const gutter = 5;
    const inset = ([x, y, w, h]) => [x + gutter, y + gutter, w - 2 * gutter, h - 2 * gutter];
    const from = inset(tileRect(...SOURCE));
    const to = inset(tileRect(...TARGET));
    const out = ease.inOut(n / 5);
    const inward = ease.inOut((n - 7) / 4);
    const lerpRect = (a, b, w) => {
      const s = Math.exp(mix(Math.log(a[2]), Math.log(b[2]), w));
      const k = (s - a[2]) / (b[2] - a[2] || 1);
      return [mix(a[0], b[0], k), mix(a[1], b[1], k), s, s * (HEIGHT / WIDTH)];
    };
    const view = n < 7 ? lerpRect(from, whole, out) : lerpRect(whole, to, inward);
    const sx = WIDTH / view[2];
    const sy = HEIGHT / view[3];
    const map = ([x, y, w, h]) => [(x - view[0]) * sx, (y - view[1]) * sy, w * sx, h * sy];
    c.fillStyle = NAVY;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    TILES.forEach((entry, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const inner = map(inset(tileRect(col, row)));
      if (inner[0] > WIDTH || inner[1] > HEIGHT || inner[0] + inner[2] < 0 || inner[1] + inner[3] < 0) return;
      const delay = Math.hypot(col - SOURCE[0], row - SOURCE[1]) * 0.25;
      const awake = entry === 'source' ? 1 : ease.circOut((n + 0.5 - delay) / 1.5);
      if (awake <= 0) return;
      const source = entry === 'source' ? frame : entry === 'target' ? named('grid').end : entry + n;
      this.drawFrame(this.tile.ctx, source, { tile: true });
      const grow = mix(0.86, 1, awake);
      const [ix, iy, iw, ih] = inner;
      c.save();
      c.globalAlpha = awake;
      c.imageSmoothingQuality = 'high';
      c.drawImage(this.tile.canvas, ix + (iw * (1 - grow)) / 2, iy + (ih * (1 - grow)) / 2, iw * grow, ih * grow);
      const shown = entry === 'source' ? source : entry === 'target' ? named('grid').end : source;
      const label = `t = ${(shown / FPS).toFixed(3).padStart(6, '0')}`;
      const fontSize = Math.max(11, 13 * sx);
      c.globalAlpha = awake * 0.85 * (1 - inward) * Math.min(1, n / 1.5 + (entry === 'source' ? 0 : 1));
      c.fillStyle = 'rgba(6, 11, 24, 0.72)';
      c.fillRect(ix + 8 * sx, iy + ih - 26 * sy, 108 * (fontSize / 13), 18 * (fontSize / 13));
      text(c, {
        family: 'JetBrains Mono', size: fontSize, x: ix + 14 * sx, y: iy + ih - 12.5 * sy,
        copy: label, fill: entry === 'source' || entry === 'target' ? GOLD : '#e9edf5',
      });
      c.restore();
    });
    const phrases = ['any frame,', 'any machine.'];
    const shown = phrases.filter((_, i) => n >= 2 + i * 1.5);
    if (shown.length && n < 9) {
      const { width } = layout('Space Grotesk', 58, phrases.join(' '), -1.5);
      c.save();
      c.globalAlpha = n < 8 ? 1 : 9 - n;
      c.fillStyle = 'rgba(6, 11, 24, 0.86)';
      c.beginPath();
      c.roundRect(720 - width / 2 - 34, 486, width + 68, 100, 50);
      c.fill();
      text(c, { family: 'Space Grotesk', size: 58, x: 720 - width / 2, y: 557, copy: shown.join(' '), letterSpacing: -1.5, fill: CREAM });
      c.restore();
    }
  }

  // The pages fly out, and the sun shrinks to one point --------------------------------------

  drawBurst(c, frame, n) {
    const cam = CAMERAS.orbitC;
    const burst = ease.cubicIn(n / 13);
    const shrink = ease.inOut((n - 4) / 12);
    const surge = 1.1 + 1.3 * Math.exp(-(((n - 4) / 4) ** 2));
    const t = frame / FPS;
    vignette(c, '#0D1838', NAVY, cam.cx, cam.cy);
    this.motes(c, frame, { alpha: 0.55 });
    // Trails: where the pages were a moment ago, fainter.
    for (let g = 3; g >= 1; g--) {
      const past = this.orbitCards(cam, t - g * 0.02, ease.cubicIn((n - g * 0.7) / 13));
      for (const card of past) this.drawCard(c, card, t, cam, 0.1 * (4 - g) * clamp01(n / 3));
    }
    const cards = this.orbitCards(cam, t, burst);
    for (const card of cards) if (card.zc < 0) this.drawCard(c, card, t, cam);
    const r = Math.max(92 * mix(1, 0.09, shrink), 6) * (1 + 0.12 * shrink * Math.sin(n * 0.9));
    const box = r * 7.5;
    this.stage.draw(c, 'sun', [cam.cx - box / 2, cam.cy - box / 2, box, box], { uRadius: r, uGlow: surge }, { time: t });
    for (const card of cards) if (card.zc >= 0) this.drawCard(c, card, t, cam);
    const label = ease.inOut((n - 13) / 5);
    if (label > 0) {
      c.save();
      c.globalAlpha = label;
      text(c, { family: 'Space Grotesk', size: 46, x: 720, y: 660 + 10 * (1 - label), copy: 'from one page', anchor: 'middle', letterSpacing: -1, fill: CREAM });
      c.restore();
    }
  }

  // One page becomes every frame: a helix of moments, flying past ----------------------------

  drawFrames(c, frame, n) {
    const t = frame / FPS;
    vignette(c, '#0B1430', NAVY, 720, 500);
    const glow = c.createRadialGradient(720, 500, 0, 720, 500, 640);
    glow.addColorStop(0, 'rgba(240, 187, 59, 0.28)');
    glow.addColorStop(0.25, 'rgba(240, 187, 59, 0.07)');
    glow.addColorStop(1, 'rgba(240, 187, 59, 0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    this.motes(c, frame, { alpha: 0.6 });
    const open = ease.inOut((n - 4) / 10);
    const camZ = Math.max(0, n - 4) * 52;
    const frames = [];
    for (let i = 0; i < 26; i++) {
      const z = 120 + i * 210 - camZ;
      if (z < -260 || z > 5200) continue;
      const persp = 820 / (820 + z);
      const a = i * 0.62 + 0.5 + t * 0.15;
      const radius = 520 * open;
      frames.push({ i, z, persp, x: 720 + Math.cos(a) * radius * persp, y: 500 + Math.sin(a) * radius * 0.7 * persp });
    }
    frames.sort((a, b) => b.z - a.z);
    if (n < 5) {
      const s = ease.backOut(n / 5);
      drawPage(c, 'landscape', 720 - 150 * s, 500 - 100 * s, 300 * s, 200 * s, 2);
    } else {
      for (const f of frames) {
        const w = 300 * f.persp;
        const h = 200 * f.persp;
        c.save();
        c.globalAlpha = clamp01(1 - f.z / 5200) * clamp01((f.z + 260) / 140);
        drawPage(c, 'landscape', f.x - w / 2, f.y - h / 2, w, h, 2 + f.i * 0.9);
        c.fillStyle = `rgba(6, 11, 24, ${clamp01(f.z / 4200) * 0.75})`;
        c.beginPath();
        c.roundRect(f.x - w / 2, f.y - h / 2, w, h, 12 * f.persp);
        c.fill();
        c.restore();
      }
    }
    c.save();
    c.shadowColor = 'rgba(6, 11, 24, 0.9)';
    c.shadowBlur = 24;
    // Read diagonally, clear of the helix: one page at the top, every frame at the bottom.
    const words = n <= 2 ? 'from' : n <= 5 ? 'from one' : 'from one page';
    text(c, { family: 'Space Grotesk', size: 50, x: 110, y: 180, copy: words, letterSpacing: -1, fill: CREAM });
    const right = ease.inOut((n - 10) / 6);
    c.globalAlpha = right;
    text(c, { family: 'Space Grotesk', size: 50, x: 1330, y: 930 + 10 * (1 - right), copy: 'to every frame.', anchor: 'end', letterSpacing: -1, fill: CREAM });
    c.restore();
  }

  // T, I, M, E -------------------------------------------------------------------------------

  drawPulse(c, frame, k, n) {
    const pulse = PULSES[k];
    const t = frame / FPS;
    vignette(c, pulse.bg, pulse.edge);
    if (k === 1 || k === 3) this.motes(c, frame, { alpha: 0.5 });
    const pop = ease.circOut(n / 4);
    this.stage.draw(c, 'glass', [440, 260, 560, 560], {
      uShape: pulse.shape,
      uRot: [0.25, 0.75 * Math.sin(t * 3 + k * 1.7), 0.08],
      uHand: 1.4 - t * 6,
      uKey: [1, 0.8, 0.4],
      uRim: [0.27, 0.62, 0.94],
      uTint: [1, 1, 1.15],
      uZoom: mix(1.3, 1, pop),
    }, { time: t });
    PULSES.slice(0, k + 1).forEach((p, i) => {
      text(c, { family: 'Space Grotesk', size: 42, x: 250 + i * 312, y: 556, copy: p.letter, anchor: 'middle', fill: pulse.ink });
    });
  }

  // The finale: letters arrive as light, and the sun comes up --------------------------------

  drawFinale(c, frame, n) {
    const t = frame / FPS;
    const { sun, radius, targets, baseline } = this.lock;
    const rise = ease.circOut((n - 4) / 16);
    const sunY = mix(1320, sun[1], rise);
    this.stage.draw(c, 'sky', FULL, { uSun: [sun[0], sunY], uDawn: ease.inOut((n - 6) / 34) }, { time: t });
    this.motes(c, frame, { alpha: 0.7 });
    // The sun, alive.
    const flare = ease.inOut((n - 60) / 15);
    if (sunY < 1300) {
      const box = radius * 9;
      this.stage.draw(c, 'sun', [sun[0] - box / 2, sunY - box / 2, box, box], { uRadius: radius, uGlow: 1 + 0.9 * flare }, { time: t });
    }
    // Rays draw out once it has risen.
    c.save();
    c.strokeStyle = GOLD;
    c.globalAlpha = 0.5;
    c.lineCap = 'round';
    c.lineWidth = 6 * LOGO;
    const spin = n > 30 ? (n - 30) * 0.0025 : 0;
    for (let i = 0; i < 8; i++) {
      const grow = ease.circOut((n - (20 + i * 1.4)) / 4);
      if (grow <= 0) continue;
      const a = (i * Math.PI) / 4 + spin;
      const r0 = 40 * LOGO;
      const r1 = r0 + 16 * LOGO * grow;
      c.beginPath();
      c.moveTo(sun[0] + Math.cos(a) * r0, sunY + Math.sin(a) * r0);
      c.lineTo(sun[0] + Math.cos(a) * r1, sunY + Math.sin(a) * r1);
      c.stroke();
    }
    c.restore();

    // HELIOS, letter by letter, each on a curved path with a trail of light.
    const sweepX = n < 60 ? -1e4 : mix(380, 1480, ease.inOut((n - 60) / 13));
    'HELIOS'.split('').forEach((ch, i) => {
      const arrive = 7 + i * 1.3;
      const begin = arrive - 9;
      const angle = 2.3 + i * 0.75;
      const start = [720 + Math.cos(angle) * 1150, 520 + Math.sin(angle) * 900];
      const end = [targets[i], baseline];
      const ctrl = [mix(start[0], end[0], 0.5) + Math.sin(angle) * 380, mix(start[1], end[1], 0.5) - Math.cos(angle) * 380];
      const at = (q) => {
        const p = ease.cubicOut(q);
        const u = 1 - p;
        return [u * u * start[0] + 2 * u * p * ctrl[0] + p * p * end[0], u * u * start[1] + 2 * u * p * ctrl[1] + p * p * end[1], p];
      };
      const q = clamp01((n - begin) / 9);
      if (q <= 0) return;
      const glyph = (x, y, p, fill, alpha, comp = 'source-over') => {
        c.save();
        c.globalAlpha = alpha;
        c.globalCompositeOperation = comp;
        c.translate(x, y);
        c.rotate((1 - p) * (i % 2 ? -1.3 : 1.3));
        const s = mix(0.45, 1, p);
        c.scale(s, s);
        text(c, { ...WORD, letterSpacing: 0, copy: ch, anchor: 'middle', fill });
        c.restore();
      };
      if (q < 1) {
        // The light trail: earlier moments of the same letter.
        const trail = new Path2D();
        for (let k = 0; k <= 10; k++) {
          const [x, y] = at(clamp01((n - k * 0.6 - begin) / 9));
          if (k === 0) trail.moveTo(x, y - WORD.size * 0.35);
          else trail.lineTo(x, y - WORD.size * 0.35);
        }
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = 'rgba(255, 214, 140, 0.55)';
        c.shadowColor = 'rgba(240, 187, 59, 0.9)';
        c.shadowBlur = 14;
        c.lineWidth = 5;
        c.lineCap = 'round';
        c.stroke(trail);
        c.restore();
        for (let k = 5; k >= 1; k--) {
          const [x, y, p] = at(clamp01((n - k * 0.55 - begin) / 9));
          glyph(x, y, p, 'rgb(255, 222, 160)', 0.16 * (1 - k / 6), 'lighter');
        }
      }
      const [x, y, p] = at(q);
      const settle = clamp01((n - arrive) / 6);
      const [r, g, b] = [mix(255, 68, settle), mix(244, 157, settle), mix(222, 240, settle)].map(Math.round);
      glyph(x, y, p, `rgb(${r}, ${g}, ${b})`, 1);
      const sweep = Math.exp(-(((x - sweepX) / 60) ** 2));
      if (sweep > 0.01) glyph(x, y, p, '#ffffff', 0.8 * sweep, 'lighter');
    });

    if (n >= 34) {
      const line = 'video is light over time.';
      const typed = Math.min(line.length, Math.floor((n - 34) * 1.5));
      const { width } = layout('JetBrains Mono', 32, line, 0.5);
      const x = 720 - width / 2;
      if (typed > 0) text(c, { family: 'JetBrains Mono', size: 32, x, y: 690, copy: line.slice(0, typed), letterSpacing: 0.5, fill: '#B8C7DE' });
      if (Math.floor(n / 3) % 2 === 0 || typed < line.length) {
        c.fillStyle = GOLD;
        c.fillRect(x + (width / line.length) * typed + 3, 665, 16, 32);
      }
    }
    const cta = ease.inOut((n - 55) / 8);
    if (cta > 0) {
      const copy = 'github.com/BintzGavin/helios';
      const { width } = layout('JetBrains Mono', 21, copy, 0.5);
      c.save();
      c.globalAlpha = cta * 0.75;
      text(c, { family: 'JetBrains Mono', size: 21, x: 720 - width / 2, y: 750 + 8 * (1 - cta), copy, letterSpacing: 0.5, fill: '#7F93B3' });
      c.restore();
    }
  }

  // The grade --------------------------------------------------------------------------------

  look(frame) {
    const scene = sceneOf(frame);
    const n = frame - scene.start;
    const index = SCENES.indexOf(scene);
    const name = scene.name;
    const seed = fract(Math.sin(index * 12.9898) * 43758.5453);
    // A warm leak of light on hard cuts; none where the grid dives into its next shot.
    const seamless = name === 'grid' || scene.start === named('grid').end || name === 'flash';
    const leak = index > 0 && !seamless ? 0.32 * Math.exp(-n / 2.2) : 0;
    const look = {
      time: frame / FPS,
      frame,
      threshold: 0.55,
      bloom: 0.75,
      haze: 0,
      shocks: [],
      rays: [0, 0, 0, 0],
      leak: [seed < 0.5 ? -0.05 : 1.05, 0.25 + 0.5 * seed, 0.55, leak],
      leakColor: [1, 0.55, 0.28],
      weave: [Math.sin(frame * 1.7) * 0.2 + Math.sin(frame * 0.37) * 0.1, Math.cos(frame * 1.3) * 0.16],
      aberration: 0.006,
      grain: 0.018,
      vignette: 0.14,
      zoom: 1,
    };
    if (name === 'write') return { ...look, threshold: 0.4, bloom: 1.05 };
    if (name === 'prism') return { ...look, threshold: 0.5, bloom: 0.85 };
    if (name.startsWith('orbit') || name === 'flash' || name === 'burst') {
      const cam = CAMERAS[name] || CAMERAS[name === 'burst' ? 'orbitC' : 'orbitA'];
      return { ...look, rays: [cam.cx, cam.cy, 0.9, 1] };
    }
    if (name === 'frames') return { ...look, rays: [720, 500, 0.7, 1] };
    if (name === 'grid') return { ...look, bloom: 0.35, threshold: 0.8, vignette: 0.12 };
    if (name === 'pulseT' || name === 'pulseM') return { ...look, threshold: 0.92, bloom: 0.4 };
    if (name === 'finale') {
      const { sun } = this.lock;
      const flare = ease.inOut((n - 60) / 15);
      const sunY = mix(1320, sun[1], ease.circOut((n - 4) / 16));
      return {
        ...look,
        threshold: 0.5,
        bloom: 0.75 + 0.5 * flare,
        rays: n >= 8 ? [sun[0], sunY, 0.9 + 1.1 * flare, 1] : [0, 0, 0, 0],
        vignette: 0.2,
        zoom: 1 + 0.04 * ease.inOut((n - 46) / 29),
      };
    }
    return look;
  }
}

/** A radial backdrop: `inner` at (x, y), `outer` at the corners. */
function vignette(c, inner, outer, x = 720, y = 540) {
  const g = c.createRadialGradient(x, y, 0, x, y, 1000);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  c.fillStyle = g;
  c.fillRect(0, 0, WIDTH, HEIGHT);
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
