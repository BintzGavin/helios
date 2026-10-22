# Time tricks

Timing techniques that remain **pure functions of `t`**. A Helios page can be asked for any frame in any order, so nothing below integrates step by step, carries state or counts frames as they render. Anything that looks like simulation is either closed-form or a table built in `ready` and read by interpolation.

Shared helpers:

```js
const FPS = 30;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));         // 0 -> 1 across [a, b]
const easeIO = (x) => (x = clamp(x), x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
```

## 1. Frames, steps and the epsilon

```js
const frameOf = (t) => Math.floor(t * FPS + 0.5);                // nearest frame: per-frame discrete state
const stepped = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps; // time quantised in seconds
```

- Frame `n` is rendered at `t = n / FPS`, and `n / 30 * 12` can come out as `3.9999999`. Without the `1e-6`, a held drawing changes one frame late at random places.
- `frameOf` rounds instead of flooring, so motion-blur sub-samples (±0.25 frame, section 11) all map to their own frame, and per-frame random states never smear across frames.
- Step at an fps that divides the output fps: on twos at 24 fps = 12 drawings/s, and on twos at 30 fps = 15. Stepping at 12 inside a 30 fps render gives an uneven 3-2-3 cadence that reads as judder. If the style wants 12 drawings/s, render with `--fps 24`.

## 2. Exposure sheets

Hand animation doesn't keep one step rate. It runs on ones for fast action, twos for normal motion and threes for holds. Write the sheet as frame ranges. Each range returns a **drawing id**, which seeds line boil and texture choice, and a **drawing time**, which drives the pose. Everything inside a hold then freezes together.

```js
const XSHEET = [[0, 24, 2], [24, 36, 1], [36, 72, 2], [72, 96, 3]];   // [fromFrame, toFrame, hold] at 24 fps
function exposure(t, fps = 24) {
  const f = Math.floor(t * fps + 1e-6);
  let id = 0;
  for (const [a, b, n] of XSHEET) {
    if (f >= b) { id += Math.ceil((b - a) / n); continue; }
    const k = Math.floor((f - a) / n);
    return { id: id + k, t: (a + k * n) / fps, hold: n };
  }
  const [, b] = XSHEET[XSHEET.length - 1];
  return { id: id - 1, t: (b - 1) / fps, hold: 0 };
}
// const D = exposure(t); pose(D.t); boilSeed = D.hold === 3 ? D.id % 3 : D.id % 4;  // classic 3–4 drawing boil loop
```

## 3. `sceneTime(t)`: remapping the clock

Draw the scene from `sceneTime(t)` instead of `t`, and the edit happens in one function: freeze frames, stutter, a few frames played backwards, tape-stop. Keep the remap continuous wherever you don't want a visible jump, and track the accumulated lag explicitly.

```js
function sceneTime(t) {
  const f = frameOf(t), lag = 5 / FPS;                        // after the rewind the scene runs 5 frames late
  if (t < 1.0) return stepped(t, 15);                         // 0-1 s: stutter at 15 fps
  if (f >= 45 && f < 48) return (44 - (f - 45)) / FPS;        // 1.5 s: three frames backwards (44, 43, 42)
  if (t < 2.5) return f >= 48 ? t - lag : t;                  // play on (from frame 43)
  if (t < 3.0) return 2.5 - lag;                              // freeze 0.5 s
  if (t < 4.0) return t - 0.5 - lag;                          // resume
  const d = 0.8, u = Math.min(t - 4.0, d);                    // tape stop: speed falls 1 -> 0 over d s
  return 3.5 - lag + u - (u * u) / (2 * d);
}
```

The tape stop is the integral of a speed that falls linearly from 1 to 0, so it decelerates smoothly. For a mechanical wind-down, quantise it as well (`stepped` at 15, then 8). UI, captions and music-locked accents usually stay on real `t`, and only the "footage" is remapped.

## 4. Per-frame discrete state: digit rolls and typed text

```js
function roll(t, t0, final, id = 0, frames = 5) {           // slot-machine digits, then the real value
  if (t < t0) return '';
  const f = frameOf(t) - frameOf(t0);
  if (f >= frames) return final;
  return final.replace(/[0-9]/g, (c, i) => String(Math.floor(hash(id * 131 + i * 17 + f) * 10)));
}
const typed = (t, t0, str, cps = 30) => str.slice(0, Math.max(0, Math.floor((t - t0) * cps + 1e-6)));
const counter = (t, t0, t1, to) => Math.round(to * easeIO(seg(t, t0, t1))).toLocaleString('en-US');
```

Draw digits in fixed-width cells (a monospace font, or one `fillText` per digit at a fixed advance) so the number doesn't wobble as it changes. A typing cursor that blinks at about 2 Hz is fine. Anything larger or brighter that alternates faster than 3 Hz counts as flashing.

## 5. Closed-form springs

A damped spring has an exact solution, so use it directly. Set `f` (Hz) and damping ratio `z` (0.3 is bouncy, 0.5 is lively, 0.7 barely overshoots).

```js
function spring(t, f = 2, z = 0.4) {                        // 0 -> 1 with overshoot
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, a = z * w, b = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-a * t) * (Math.cos(b * t) + (a / b) * Math.sin(b * t));
}
function springVel(t, f = 2, z = 0.4) {                     // its exact derivative
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f, a = z * w, b = w * Math.sqrt(1 - z * z);
  return Math.exp(-a * t) * (w * w / b) * Math.sin(b * t);
}
const critical = (t, w = 10) => (t <= 0 ? 0 : 1 - (1 + w * t) * Math.exp(-w * t));   // fastest settle, no overshoot
function pop(t, t0, f = 2.4, z = 0.42, amount = 0.12) {     // scale-in with squash & stretch from velocity
  const u = t - t0, v = springVel(u, f, z) / (2 * Math.PI * f);
  const st = 1 + clamp(v * amount * 2, -0.3, 0.3);         // stretch along the motion
  return { s: spring(u, f, z), sx: 1 / st, sy: st };        // area-preserving
}
```

**Several targets:** the spring is linear, so a value that is sent to new targets over time is exactly the sum of one spring per change. No state is needed:

```js
function springTo(t, changes, f = 2, z = 0.45) {            // changes: [[t0, v0], [t1, v1], [t2, v2], ...]
  let v = changes[0][1];
  for (let i = 1; i < changes.length; i++) v += (changes[i][1] - changes[i - 1][1]) * spring(t - changes[i][0], f, z);
  return v;
}
```

Retargeting mid-flight keeps the momentum, which is what makes UI cursors and camera follows feel physical. Once a spring has visibly settled (`u > 4 / (z·2πf)`), blend it to exactly 1 so a big zoom doesn't show sub-pixel creep.

## 6. Impulses: shakes and jolts

A hit is a decaying cosine that starts at the hit. Shake is the sum over every hit, so overlapping hits add up naturally.

```js
const HITS = [[1.2, 18], [2.05, 10], [3.4, 26]];             // [time, px]
function shake(t, k = 9, hz = 11) {
  let x = 0, y = 0;
  for (const [t0, amp] of HITS) {
    const d = t - t0; if (d < 0) continue;
    const e = amp * Math.exp(-k * d);
    x += e * Math.cos(2 * Math.PI * hz * d + hash(t0) * 6.28);
    y += e * Math.cos(2 * Math.PI * hz * 1.37 * d + hash(t0 + 1) * 6.28);
  }
  return [x, y];
}
```

Cosine gives a hard jolt on the hit frame, while `sin` starts from zero for a softer kick. The same sum on scale (`1 + 0.03 · Σ`) gives a punch-in, and on rotation a wobble. Take the hit times from `track.beats.json` (`drums`, `hits`) so they land on the music.

## 7. Keyframe tracks and camera keys

```js
function K(t, keys) {                                        // keys: [[t0, v0], [t1, v1, ease], ...]; v may be an array
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease = easeIO] = keys[i];                 // ease belongs to the segment arriving at key i
    if (t >= t1) continue;
    const [t0, v0] = keys[i - 1], u = ease((t - t0) / (t1 - t0));
    return Array.isArray(v0) ? v0.map((a, j) => a + (v1[j] - a) * u) : v0 + (v1 - v0) * u;
  }
  return keys[keys.length - 1][1];
}
```

`K` stops at every key, which suits graphic moves. A camera that should *flow through* its keys needs a spline. A monotone cubic (Fritsch–Carlson) passes through every key with continuous velocity and never overshoots, so a camera doesn't drift past a framing and come back, and repeated values become clean holds:

```js
function monotone(keys) {                                    // [[t, v], ...] -> t => v
  const n = keys.length, x = keys.map((k) => k[0]), y = keys.map((k) => k[1]);
  const d = x.slice(1).map((_, i) => (y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  const m = y.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { m[i] = (3 / Math.sqrt(s)) * a * d[i]; m[i + 1] = (3 / Math.sqrt(s)) * b * d[i]; }
  }
  return (t) => {
    if (t <= x[0]) return y[0]; if (t >= x[n - 1]) return y[n - 1];
    let i = 0; while (t > x[i + 1]) i++;
    const h = x[i + 1] - x[i], u = (t - x[i]) / h, u2 = u * u, u3 = u2 * u;   // cubic Hermite basis
    return (2 * u3 - 3 * u2 + 1) * y[i] + (u3 - 2 * u2 + u) * h * m[i] + (3 * u2 - 2 * u3) * y[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}
// const camX = monotone([[0, 960], [2, 1400], [3.5, 1400], [6, 600]]);  // 2–3.5 s is a hold
```

## 8. Zoom: log space and the smooth zoom

Zoom is multiplicative, so interpolate `log(z)`: `z = Math.exp(lerp(Math.log(z0), Math.log(z1), e))`. A 1×→16× zoom then feels like constant speed instead of rushing at the end. Interpolate keyed zoom with `monotone` over `log z` as well. To zoom about a point, keep that point at the same place on screen and solve for the camera centre.

When the camera has to travel far *and* change zoom (map to street, overview to detail), use van Wijk and Nuij's smooth zoom. It pulls out, pans while wide and pushes in, along the path that keeps perceived motion steady. Here `w` is the visible width:

```js
function smoothZoom([x0, y0, w0], [x1, y1, w1], rho = 1.4) {  // returns { S, at(u) -> [x, y, w] }, u in 0..1
  const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy), r2 = rho * rho;
  if (d < 1e-6) { const S = Math.log(w1 / w0) / rho; return { S, at: (u) => [x0, y0, w0 * Math.exp(rho * u * S)] }; }
  const b = (wa, sign) => (w1 * w1 - w0 * w0 + sign * r2 * r2 * d * d) / (2 * wa * r2 * d);
  const r = (bb) => Math.log(Math.sqrt(bb * bb + 1) - bb);
  const r0 = r(b(w0, 1)), r1 = r(b(w1, -1)), S = (r1 - r0) / rho;
  return { S, at: (u) => {
    const s = u * S, k = (w0 / (r2 * d)) * (Math.cosh(r0) * Math.tanh(rho * s + r0) - Math.sinh(r0));
    return [x0 + k * dx, y0 + k * dy, (w0 * Math.cosh(r0)) / Math.cosh(rho * s + r0)];
  } };
}
// build the path in ready; in renderAt: const [cx, cy, w] = path.at(easeIO(seg(t, 2, 2 + 0.35 * path.S))); zoom = W / w;
```

`S` is the path's natural length. Making the duration proportional to `S` gives every flight the same perceived speed. A higher `rho` pulls out further.

## 9. Precomputed integrals (built in `ready`)

When you know a *speed* curve but need *position* (a car whose speed surges, a camera dolly that slows into holds), integrate once into a table and interpolate in `renderAt`. It is exact enough at 600 samples/s, and it stays pure.

```js
const DUR = 10, DT = 1 / 600, POS = new Float64Array(Math.ceil(DUR / DT) + 2);
const speed = (t) => 400 + 900 * easeIO(seg(t, 1, 2.5)) - 1100 * easeIO(seg(t, 6, 7));   // px/s
const ready = (async () => {
  for (let i = 1; i < POS.length; i++) POS[i] = POS[i - 1] + DT * 0.5 * (speed((i - 1) * DT) + speed(i * DT));
  await document.fonts.ready;
})();
const posAt = (t) => { const x = clamp(t / DT, 0, POS.length - 2), i = Math.floor(x); return lerp(POS[i], POS[i + 1], x - i); };
```

The same trick gives a "camera clock": a speed of 0 during holds and above 1 just after, so the camera catches up and lands back on schedule. Invert the table with a binary search to find *when* the camera reaches a mark.

## 10. Curvature-weighted arc length (pen timing)

A pen drawing a path at constant arc-length speed looks mechanical, because a hand slows into corners. Weight each step's "time cost" by the turning nearby, then map linear time → weighted length → point:

```js
function pacedPath(pts, kCorner = 3, r = 6) {              // pts: dense [[x,y],...], ~2-5 px apart
  const n = pts.length, S = new Float64Array(n), T = new Float64Array(n), turn = new Float64Array(n);
  const dir = (i) => Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
  for (let i = 1; i < n - 1; i++) { const a = dir(i) - dir(i - 1); turn[i] = Math.abs(Math.atan2(Math.sin(a), Math.cos(a))); }
  for (let i = 1; i < n; i++) {
    let c = 0; for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) c += turn[j];  // turning nearby
    const ds = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    S[i] = S[i - 1] + ds;
    T[i] = T[i - 1] + ds * (1 + kCorner * c);               // corners cost extra "time"
  }
  return (u) => {                                            // u: 0..1 progress in time -> [x, y, arcLength]
    const tau = clamp(u) * T[n - 1];
    let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= tau) lo = m; else hi = m; }
    const f = (tau - T[lo]) / (T[hi] - T[lo] || 1);
    return [lerp(pts[lo][0], pts[hi][0], f), lerp(pts[lo][1], pts[hi][1], f), lerp(S[lo], S[hi], f)];
  };
}
```

Sample SVG paths with `getPointAtLength` in `ready`. Draw the stroke up to the returned arc length (`setLineDash([s, 1e9])`). Feed `u` through `monotone` keys to add punctuation pauses at chosen points.

## 11. In-page motion blur

To get real shutter blur, render the moving layer at N sub-times across the shutter and average them. A running mean with `globalAlpha = 1/(i+1)` gives each sample weight 1/N without a float buffer.

```js
const SHUTTER = 0.5;                                        // 0.5 = 180° shutter
const snap = (ts) => Math.round(ts * FPS) / FPS;            // any sub-time -> its frame's time
const FAST = [[0.4, 1.6], [2.8, 3.6]];                      // only blur where motion is fast
const samplesAt = (t) => FAST.some(([a, b]) => t >= a && t <= b) ? 10 : 1;
const sub = mk(W, H, { willReadFrequently: true });         // mk = canvas helper from finishing.md

function renderBlurred(ctx, t, drawMoving) {                 // drawMoving(g, ts) must paint every pixel
  const N = samplesAt(t);
  if (N === 1) { drawMoving(ctx, t); return; }
  for (let i = 0; i < N; i++) {
    const ts = Math.max(0, t + (SHUTTER / FPS) * ((i + 0.5) / N - 0.5));
    sub.g.setTransform(1, 0, 0, 1, 0, 0); sub.g.globalAlpha = 1; sub.g.globalCompositeOperation = 'source-over';
    drawMoving(sub.g, ts);
    ctx.globalAlpha = 1 / (i + 1);                          // running mean: keeps every sample at weight 1/N
    ctx.drawImage(sub, 0, 0);
  }
  ctx.globalAlpha = 1;
}
// renderAt: renderBlurred(g, t, drawMoving); drawCrisp(g, t);   // text, counters, HUD drawn once, sharp
```

- **Keep the crisp things crisp.** Text, counters and UI are drawn once at the frame's `t` after the blurred layer (`drawCrisp`). If something sharp has to sit *inside* the blurred layer, evaluate its position at `snap(ts)` (a "crisp" time) so all N copies coincide.
- **Never straddle a cut.** Gate scene changes on `snap(ts)`, not `ts`. Otherwise the frame on a cut averages two shots into a double exposure. Also use `snap` or `frameOf` for per-frame random states.
- **Sample count:** pick N so each sample moves ≤ 4–6 px. N ≈ (px moved per frame × SHUTTER) / 5, typically 8–16. Fewer samples show as discrete ghost copies. Above about 16, 8-bit rounding in the running mean can start to show.
- **Cost:** N samples cost N renders. Enable it only in fast windows (`FAST`, set from your cue list) and at 1 elsewhere. A shorter shutter (0.2–0.25) suits contact and impact frames, where a long shutter would ghost the squash.
- Camera-only moves can be blurred more cheaply by drawing the finished frame N times at the sub-time camera offsets.

## 12. Timing moves to music

- **Snap moves to land on the beat.** A move should *arrive* on the beat, not start on it. Start one note value early: `const land = (t, tBeat, lead = BEAT / 2) => easeIO(seg(t, tBeat - lead, tBeat))`, with an eighth (`BEAT/2`) for snappy moves and a quarter for big ones. A curve with a slow start and a firm landing, such as `cubic-bezier(.7,0,.2,1)`, puts most of the travel just before the hit.
- **Accelerate by dividing the beat, not by changing tempo.** For a build, keep the BPM and move from steps on quarters to eighths to sixteenths. Each step uses the same eased shape, only shorter. The audience feels the subdivision lock to the music, while a sped-up tempo drifts off it.

```js
const BPM = 120, BEAT = 60 / BPM;
function acceleratingHits(t0, bars) {                        // bar k: 4·2^k evenly spaced hits, same tempo
  const hits = []; let t = t0;
  for (let k = 0; k < bars; k++) { const n = 4 * 2 ** k, dt = (4 * BEAT) / n; for (let i = 0; i < n; i++) hits.push([t + i * dt, dt]); t += 4 * BEAT; }
  return hits;
}
const steppedMove = (t, hits) => hits.reduce((p, [th, dt]) => p + easeIO(seg(t, th, th + dt * 0.8)), 0);  // 0..hits.length
```

With real music, take beat times from `helios analyze` (`beats`, `downbeats`) rather than `k * BEAT`, because songs drift. Below about 3 frames per step (sixteenths above ~150 BPM at 30 fps) the steps blur together, so stop subdividing there or switch to a continuous move.

---

Credits: techniques adapted from [mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15) by Vincentwei1021 (MIT), in particular the flat-vector, line-art, isometric, cel-boil, liquid, bauhaus, synthwave, paperclip and HUD demos, and [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) by LemoLab (MIT), in particular `core/lib.js`, `styles/swiss-motion/demo/ease.js`, `styles/pictogram-motion/demo/scenes.js` and `styles/risograph/demo/film.js`. The text and code are our own.
