# One Line

A single unbroken line, drawn on as we watch, that turns out to be the whole picture. **Not:** line-art icons with many strokes and cuts, nor a whiteboard explainer with a hand and a marker.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Premium brand films, origin stories, journeys and timelines, logo reveals | Canvas 2D + one arc-length sampled path drawn to a timing spline | Medium | an OFL display serif or script (Cormorant Garamond, Sacramento) |

Demo: [one-line.html](one-line.html) — `npx -y @helios-project/cli@latest render one-line.html -o one-line.mp4 --duration 8 --mode canvas`

## Look
- **Palette (night):** midnight `#16233D` centre → `#070D18` edge (ground, a soft radial gradient), champagne gold `#E9D6A6` (the line), aged gold `#947C52` (old line), hot gold `#FFF7E0` (the nib and fresh ink), brushed fill `#F4E4B8 → #D9BF82 → #A4824A` (the one filled shape).
  - Rules: one line colour that varies only in *brightness* with age. Nothing else is drawn except one filled shape, made by the line closing on itself. Faint gold motes are allowed in the air; no other colour.
  - **Paper variant:** warm white `#F4EFE4` with a warm black ink line `#1D1A17` and at most one accent colour used on one stretch of the line (say a red `#C8382E`), then back to ink. Swap screen-blended glow for a soft ink bleed (multiply, ~20 %).
- **Type:** after the line is finished, never during. A wide-tracked display serif (Cormorant Garamond 500, 84 px ≈ 0.08 H, +22 px tracking) with a small sans line under it (Jost 400, 24 px, +9 px tracking, 62 % gold). Type is wiped on left to right, like the line, below the drawing in empty sky.
- **Materials & texture:** light, not ink: a thin even line (3.4 px on screen at every zoom), a glow that's the same line blurred and screen-blended, a nib that is three stacked radial glows. The paper variant is ink and paper, with grain anchored to the paper.

## Motion
- **Drawn on by arc length.** The nib position is an arc-length coordinate, not a time fraction of a path. Sample the whole drawing once into points with cumulative length.
- **The pen slows into corners.** Time runs on a curvature-weighted length `τ = ∫ (1 + K·turn) ds` (demo: K = 14, turn smoothed over ~20 px), so sharp corners get extra time and straights fly.
- **Cue markers through a monotone spline.** A table of `[time, piece end]` pairs is turned into `τ(t)` with a monotone cubic (Fritsch–Carlson): it never runs backwards and eases into repeated markers, which become holds. Speeds ~300–700 px/s on travelling lines, slow on the most important stroke.
- **Age:** a segment is hot for ~0.15 s, then dims over 1.5 s to ~50 % brightness.
- **Camera:** follow the nib with lag and lead (weighted average of the nib at t −0.45, −0.25, 0, +0.2 s) at ~2.1× zoom, then one continuous dolly out (log-space zoom) to the poster at 1×. No cuts, no pans that aren't the line's own path.
- Smooth on ones (30 fps); stepping breaks the continuous act.

## Signature checklist
- [ ] There is exactly one path: no frame shows a second line start or a gap.
- [ ] Line width is the same on screen at 2.1× and at 1× (within ±0.5 px).
- [ ] The nib visibly slows into each corner (strip: point spacing shrinks before corners).
- [ ] Segments drawn > 1.5 s ago are dimmer than the fresh tip (about half brightness).
- [ ] One closed shape swells from line to solid fill (demo: the moon, 5.18–5.7 s) with a short bloom.
- [ ] The camera follows during the drawing and dollies out to a composed poster; no cut anywhere.
- [ ] End hold ≥ 1 s with micro-motion (drifting motes, the fill's glow breathing, a slow push).

## Native moves
- **Line to fill.** The line closes a circle, holds, and the ring floods inward into a solid, bevelled disc while the glow blooms. This is the demo's peak. *Fits:* a logo's dot; a sun or moon; a coin, a planet, a "full" state.
- **The reveal was always one picture.** Each vignette the camera followed (house, tree, waves) is part of the poster seen on the dolly-out. *Fits:* a company's milestones forming its skyline; a recipe's steps forming the dish; a route forming a map.
- **The line runs off the edge.** The last stroke leaves the frame and the story continues outside it. *Fits:* "to be continued"; a journey; an open-ended invitation.

## Core technique
```js
// in ready: X, Y, S (cumulative length) sampled every 2 px; TAU = corner-weighted length
for (let i = 1; i < n; i++) TAU[i] = TAU[i-1] + (S[i] - S[i-1]) * (1 + 14 * Math.min(corner[i], .3));
const tauOf = monotone(CUES.map(c => c[0]), CUES.map(c => TAU[END[c[1]]]));   // time -> tau, holds at repeats
// when each point is drawn (for ageing), precomputed once
let j = 0; for (let t = t0; t <= tEnd; t += 1/600) { const tau = tauOf(t); while (j < n && TAU[j] <= tau) TD[j++] = t; }

// in renderAt
const head = headAt(t);                                  // fractional point index where TAU == tauOf(t)
lg.setTransform(cam.z, 0, 0, cam.z, W/2 - cam.cx*cam.z, H/2 - cam.cy*cam.z);
lg.lineWidth = LW / cam.z;                               // constant on screen
for (let i0 = 0; i0 < head; i0 += 8) {                   // chunks of 8 points, each with its own age colour
  const age = t - TD[i0 + 4], b = .5 + .5 * (1 - smooth(.15, 1.6, age));
  lg.strokeStyle = goldAt(b); /* moveTo/lineTo over the chunk, then stroke */ }
ctx.drawImage(lineC, 0, 0);
ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(7px)'; ctx.globalAlpha = .7; ctx.drawImage(lineC, 0, 0);
```
Separating *where* (arc length), *how fast* (corner-weighted τ) and *when* (a monotone spline through cue markers) is what makes the pen feel like a hand: it brakes into corners, holds on the marks you choose and never stutters backwards. See `drawFill()` for the swell and `camera()` for lag/lead follow.

## Pitfalls
- Stray connectors read as wrinkles in the final picture → plan the path like an Euler route; retrace (draw back over) a stem instead of jumping, as the demo does for the tree trunk.
- A plain `smoothstep` between cues makes the pen stop dead at every key → use a monotone cubic; repeat a marker only where you want a hold.
- Line width scales with zoom (fat at 2×, hairline at 1×) → set `lineWidth = LW / zoom`.
- `ctx.arc(x, y, r, 0, 7, true)` for the inner hole of an annulus draws a bitten circle → anticlockwise arcs need an end of exactly `2 * Math.PI`, and a `moveTo` first.
- Camera locked to the nib jitters on corners → average the nib over a short window around `t` (lag and lead), never smooth across frames.
- Thin gold lines shimmer after H.264 → ≥ 3 px on screen and a blurred glow pass under them; avoid 1 px.
- Determinism: sampling, corner weights and the draw-time table (`TD`) are built in `ready`; `ctx.filter` and composite mode are reset each frame.

## Check on stills
- `sheet --strip 1.0:1.7 --fps 15`: the nib decelerates into the house's corners and accelerates on the roof slopes.
- `sheet --at 2.5,5.0,7.9`: the line looks equally thick at 2.1× and at 1×.
- `sheet --strip 5.1:5.8 --fps 10 --crop 600,0,800,600`: ring closes, holds, floods inward as a clean annulus, blooms once.
- `still --at 7.9`: house, tree, waves, moon and the end curl all belong to one continuous line under the title.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/02-line-art (MIT, Vincentwei1021) and lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/one-line (MIT, LemoLab). Written in our own words; no assets copied.
