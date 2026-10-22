# Sticker Explainer

A calm off-white "world" canvas where die-cut stickers slap down, numbers count up and one continuous camera flies from fact to fact, ending on a pull-back that shows the whole story at once. **Not:** a slideshow of separate cards with cuts between them, or clip-art dropped on a blank background with a fade.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| science and finance explainers, "how much / how far" data stories, product breakdowns, company-process videos | Canvas 2D (or DOM) world under one camera matrix + van Wijk flights + die-cut sticker sprites | Medium | one sans font (Inter); optional `d3-interpolate` from a pinned CDN |

Demo: [sticker-explainer.html](sticker-explainer.html) — `npx -y @helios-project/cli@latest render sticker-explainer.html -o sticker-explainer.mp4 --duration 9 --mode canvas`. "One cup of coffee": a cup sticker slaps in under the title, the camera flies to an altitude count-up beside a cherry-branch sticker, then to a route arc that counts to 9,700 km. It pulls back to the whole board and lands on two word stickers.

## Look
- **Palette:** ground `#E9EEF2` (blue-grey canvas) with a world-anchored dot grid `#CBD4DC`; ink `#25313D` for headlines, numbers and leader lines; mid `#8C9AA8` for captions and kickers; card white `#F7F9FB`; **one accent** `#FF5A36`.
  - Rules: the UI layer gets 2–3 neutrals plus the accent. The accent is reserved for kicker squares, the key underline, the hero number once it lands, and one word of the end card. Body text is never coloured.
  - Stickers may carry their own object colours (greens, kraft, red). Keep those muted and flat, and keep all of them under the same 5–6 px ink outline so they read as one set.
  - Alternative: ground `#F3F0EA`, ink `#1F2430`, accent `#2F6BFF`.
- **Type:** one equal-weight grotesk, Inter. Headlines 800 at ~8.5 % of frame height, tight (−1 to −2 px tracking). Hero numbers 800 at 14–16 %, with a unit at about half size beside them. Captions 500 at ~2.8 % in mid grey. Kickers 600 at 2 % with +4 px tracking after an 18 px accent square ("01  ORIGIN").
  - Numbers are **tabular**: `font-variant-numeric: tabular-nums` in DOM, or fixed digit cells in canvas (demo `tabular()`).
  - Text is laid out *in the world*, left-aligned on a strict column next to its sticker, and moves with the camera. There is no fixed HUD.
- **Materials & texture:** flat vector art turned into stickers. Every sticker gets a **10–16 px white die-cut outline** that follows its silhouette, plus a soft drop shadow (`rgba(22,34,46,.22)`, blur 14 px, y 6 px at rest). The shadow grows while the sticker is in the air. No gradients, no grain. The only depth cues are the shadow and the outline. Photos work too: the same die-cut process unifies mismatched sources.

## Motion
- **Camera:** one continuous camera over one big world, with no cuts.
  - **Flights** between sections run 0.8–1.3 s on a van Wijk smooth zoom (ρ ≈ 0.9–1.3; larger ρ means more zoom-out on the way), with the path parameter eased in-out cubic.
  - **Drifts** between flights are slow 2–6 % zoom changes, interpolated in **log space** (`z = exp(lerp(ln z0, ln z1, e))`) so they feel constant.
  - The end is a 1.2 s pull-back to the whole board at ~0.55× zoom.
  - Banned: rotation (beyond a ≤ 2° swing on a pull), cuts, cross-dissolves and linear zooms.
- **Sticker slap:** over 0.2 s before contact, scale 1.3 → 1.0 with an accelerating ease-in (`1 − p²`), rotation +6° → base angle, shadow lift 1 → 0, and opacity in the first 20 %. On contact, a damped wobble: scale `1 − .035·w`, rotation `−0.8°·w` with `w = e^{−10·dt}·cos(2π·4.5·dt)`.
- **Count-ups:** 0.9–1.2 s, ease-out cubic, tabular, starting as the section arrives. The hero number gets a **slam**: it turns to the accent, scales 1.22 → 1 in 4 frames and adds a camera jolt.
- **Camera jolts:** a sum of impulses `A·e^{−k·dt}·cos(2π·f·dt)` (A 5–14 px, f ≈ 4 Hz, k 14–16), one per impact.
- **Motion blur:** only on fast flights. Average N sub-frames across a 180° shutter, with N chosen so taps are ≤ 3 px apart. Drifts and holds stay crisp.
- Lines (routes, leaders, the journey path between sections) grow along their length, 0.35–0.95 s. Dashed routes keep marching slowly in the end hold.

## Signature checklist
1. Every pictorial element has a **white die-cut outline of 10–16 px** and a soft shadow, and none touches the ground without one.
2. Stickers land with **scale 1.3 → 1.0 and rotation ~6° → 0 in 0.2 s**, then wobble at least 2 visible cycles that decay within ~0.4 s.
3. The camera never cuts. **Flights use a van Wijk path** (zoom out, travel, zoom in), and blur is visible only on flight frames.
4. Numbers count up on **tabular figures**: the digits do not shift sideways mid-count.
5. Palette is **2–3 neutrals + one accent** on a blue-grey ground with a world-anchored dot grid.
6. Every section adds **one new visual element** and one number. At least one **jolt** per major landing (5–14 px).
7. The ending **pulls back to show every section at once**, with a 2-word or 3-word end card set as stickers.

## Native moves
- **The flight as a sentence.** The camera's path *is* the logic: farm → route → cup, cause → effect, with the dotted journey line drawing as the camera flies along it. *Fits:* supply chains; how a law becomes a bill; a step-by-step process.
- **Slam number (hero).** The count-up decelerates, then lands with an accent colour switch, a 1.22 → 1 pop and the biggest jolt of the film at ~60–65 % of the runtime. *Fits:* the headline statistic; a price reveal; a record.
- **The board pull-back.** At the end, everything you have seen is still there, laid out as one infographic, and the end card is slapped on top. *Fits:* recaps; "so here's the whole picture"; a closing CTA.

## Core technique
```js
// van Wijk & Nuij smooth zoom: a = [cx, cy, viewWidth], b likewise, s ∈ [0,1]
function vanWijk(a, b, rho, s) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), r2 = rho * rho;
  if (d < 1e-6) { const S = Math.log(b[2] / a[2]) / rho; return [a[0], a[1], a[2] * Math.exp(rho * s * S)]; }
  const b0 = (b[2] ** 2 - a[2] ** 2 + r2 * r2 * d * d) / (2 * a[2] * r2 * d);
  const b1 = (b[2] ** 2 - a[2] ** 2 - r2 * r2 * d * d) / (2 * b[2] * r2 * d);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho, q = rho * s * S + r0;                 // S = path length
  const u = a[2] / (r2 * d) * (Math.cosh(r0) * Math.tanh(q) - Math.sinh(r0));
  return [a[0] + dx * u, a[1] + dy * u, a[2] * Math.cosh(r0) / Math.cosh(q)];
}
// die-cut outline: silhouette of the art, stamped at 32 offsets around a circle of radius pad
const sil = silhouette(art);                      // draw art, then 'source-in' fill white
for (let i = 0; i < 32; i++) { const q = i / 32 * 2 * Math.PI; o.drawImage(sil, Math.cos(q) * pad, Math.sin(q) * pad); }
o.drawImage(art, 0, 0);                           // art on top of its white border → cached sprite
// camera matrix per frame: world → screen, plus summed jolts
ctx.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z + jolt(t));
```
The camera is just keyframes `{t, x, y, z, fly?}`. A `fly` segment calls `vanWijk` with the view width `W/z`, and every other segment eases in log-zoom. Stickers are built once in `ready` by dilating a silhouette, so any art, drawn or photographed, gets the same outline. Motion blur re-renders the whole world at sub-frame times and averages them with `globalAlpha = 1/(i+1)`, which is only safe because `drawWorld(t)` is pure. See `cam`, `sticker`, `slap`, `tabular` and `renderAt` in the demo. `d3.interpolateZoom.rho(ρ)` from `d3-interpolate@3.0.1` on jsDelivr is a drop-in replacement for `vanWijk`.

## Pitfalls
- Interpolating zoom linearly → the camera rushes at one end and crawls at the other. Use log space for drifts and van Wijk for flights.
- Motion blur with too few taps → stepped onion-skin copies on fast flights. Choose N from the screen-space speed (taps ≤ 3 px apart, cap ~20), and skip blur entirely below ~6 px per half-frame.
- Proportional digits in count-ups → the number wobbles left and right. Use tabular figures or fixed digit cells.
- Canvas `shadowBlur` or a `globalAlpha` left set after drawing a sticker → it leaks into the next draw or frame. Wrap each sticker in `save()/restore()` and reset the transform, alpha and shadow at the top of `drawWorld`.
- Text set for zoom 1 becomes unreadable at the pull-back zoom (0.5×) → size end-card elements for the zoom they are seen at: 150–210 world px reads as 80–115 px on screen.
- Sticker outlines thinner than ~8 px shimmer and break up in H.264 at small zoom. Stay at 10–16 px and render the final with `--preset medium`.
- Building sticker sprites lazily on first draw → the first frame a worker renders differs. Build them all in `ready`.
- A dot grid fixed to the screen instead of the world → camera moves stop reading. Anchor it in world space.

## Check on stills
- `sheet --strip <land-0.2>:<land+0.4> --fps 30` on a sticker landing: oversize and tilted in the air, flat on contact, 2+ decaying wobbles.
- A `still` mid-flight: smooth directional blur with no ghost copies, and the zoom visibly pulled out. A still during a drift: perfectly crisp.
- `sheet --crop` on a count-up across 4–6 frames: the digit columns do not move.
- Final frame: every section is visible and legible at the pulled-back zoom, the end-card stickers have clean white outlines, and something still moves (marching dashes, steam).

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/19-paperclip (MIT, Vincentwei1021). Written in our own words; no assets copied.
