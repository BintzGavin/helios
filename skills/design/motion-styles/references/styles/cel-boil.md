# Cel Boil

Motion graphics drawn like hand-inked animation cels: brush lines that boil, colour painted slightly off the line, smears, puffs and sparks, timed from an exposure sheet. **Not:** a vector animation with a "wiggle" filter, nor character acting. For rigged characters, lip-sync and acting, use [cartoon-short](../../../../guided/cartoon-short/SKILL.md).

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Energetic titles and badges, reaction and FX moments, sale/announcement stingers, shapes and type with a handmade feel | Canvas 2D + variable-width brush polygons, seeded boil and an exposure sheet | Hard | a chunky OFL display face (Titan One, Lilita One, Bowlby One) |

Demo: [cel-boil.html](cel-boil.html) — `npx -y @helios-project/cli@latest render cel-boil.html -o cel-boil.mp4 --duration 8 --fps 24 --mode canvas`

## Look
- **Palette:** paper `#F2E6CC` (ground, mottled), ink `#1C1613` (every line), red `#E5402B` and yellow `#FFC425` (the two cel paints), cream `#FFF6E2` (puffs, highlights), shade `#DDCBA6` (cast shadows).
  - Rules: ink plus **two** paints plus paper tints. Every painted area has an ink line around it; paint never has a gradient. Paint sits 4–8 px off its line (one fixed registration offset for the film) and boils independently of the line. Shadows are flat paper-darker shapes with no line.
  - Alternative: ink `#1A1A2E` with teal `#1FB5A8` and pink `#FF5C8A` on `#F5EEDC`.
- **Type:** a chunky rounded display face, filled with a paint and outlined in ink with the same registration offset (demo: Titan One, 168 px and 236 px ≈ 0.16 and 0.22 H). Each letter is re-drawn per drawing: ±1.5 px offset, ±1° rotation, ±1.5 px outline weight. Letters pop on 1s with a 135 % first drawing. Captions, if any, are hand-lettered in the same way, never a clean UI font.
- **Materials & texture:** a paper sheet (seeded low-frequency mottling built in `ready`), a **tooth** layer multiplied over everything that changes every drawing (a new sheet per cel), brush ink that tapers at both ends and swells with pressure noise.

## Motion
- **Exposure sheet, not easing.** A table `[fromFrame, toFrame, exposure]` gives the drawing for every frame: on **2s** by default, on **1s** for fast action (falls, crashes, smears), on **3s** for holds. Each drawing has an index; pose time is the drawing's own frame (`tq = fq / 24`), so the motion steps.
- **Boil:** the line is displaced by a noise field whose seed is the drawing index modulo ~4 (3 on holds). It cycles through 4 variants, so a still object shimmers like retraced cels. Amplitude ~2.4 px at a ~70 px noise scale.
- **Keyed poses**, not curves: a pop is a list of drawings (35 % → 120 % → 93 % → 103 % → 100 %), a landing is squash 62 % → 80 % → 110 % → 100 %.
- **Smears:** for one frame, a fast object is drawn stretched to ~150–300 % of its length along its path (a teardrop with dry streaks), not motion-blurred.
- **Cel FX:** dust puffs (grow for 2 drawings, shrink over 3), tapered speed lines, four-point sparks, radial burst lines, a 2–3 drawing camera shake on impact.
- Render at **24 fps**. Camera: static or hard reframes on drawing changes; no smooth pans.

## Signature checklist
- [ ] In any 1 s strip at 24 fps, held frames repeat in pairs (on 2s) and the fall/crash frames change every frame (on 1s); holds repeat in threes.
- [ ] A static object's outline changes between consecutive drawings and repeats every 4 drawings.
- [ ] Line width varies along each stroke (taper to ~15 % at the ends, ±35 % pressure noise).
- [ ] Paint is offset from its line by 4–8 px, consistently in one direction.
- [ ] At least one smear frame (≥ 150 % stretch) on the fastest move, lasting one frame.
- [ ] Impacts get puffs, sparks or burst lines, all inked, all stepping on 1s or 2s.
- [ ] The paper tooth pattern differs between consecutive drawings.

## Native moves
- **Crash into the title.** A fast object smashes into a badge on 1s: squash, radial burst lines, sparks, a shake, and the title pops letter by letter on the impact. The demo's peak (4.75–5.3 s). *Fits:* a sale or launch stinger; "breaking" news; a score reveal.
- **The boiling hold.** Everything stops, but nothing is dead: the ink keeps boiling on 3s and sparkles pop. *Fits:* end cards; a punchline beat; a "wait for it" pause.
- **Smear and multiples.** One frame of a stretched teardrop sells speed better than any blur. *Fits:* a quick swipe; a product snapping into place; an exit.

## Core technique
```js
const SHEET = [[0,10,1], [10,24,2], [24,48,2], [48,60,3], [60,72,1], [72,108,2], [108,132,1], [132,156,2], [156,192,3]];
function drawing(f) { let id = 0;
  for (const [a, b, s] of SHEET) { if (f >= b) { id += Math.ceil((b - a) / s); continue; }
    const k = Math.floor((f - a) / s); return { fq: a + k * s, id: id + k, step: s }; }
  return { fq: 191, id, step: 3 }; }
const D = drawing(Math.floor(t * 24 + 1e-4)), tq = D.fq / 24;   // pose time steps with the drawing
const v = D.step === 3 ? D.id % 3 : D.id % 4;                     // boil variant
const boil = (pts, seed, amp = 2.4, sc = 70) => pts.map(([x, y]) => [x + amp * vn(x/sc, y/sc, seed), y + amp * vn(x/sc + 41, y/sc - 17, seed + 500)]);
// brush: an outline polygon around the boiled path; half-width = w/2 * taper * (1 + .38 * pressureNoise)
function ink(pts, { w = 7, seed }) { const q = boil(resample(pts, 4), seed); /* left/right offsets along the normal */ fillPoly([...left, ...right.reverse()], INK); }
function cel(pts, paint, seed) {                                 // paint off-register and boiled on its own seed, then the line
  fillPoly(boil(pts, seed + 77).map(p => [p[0] - 6, p[1] + 5]), paint); ink(pts, { w: 8, seed, closed: true }); }
```
Everything the eye reads as "hand-drawn" comes from three numbers per frame: which drawing it is (`fq`, `id`), which boil variant (`v`), and the seed each element derives from them. Poses are evaluated at `tq`, never at `t`, so motion steps exactly like an exposure sheet. See `ball()` for keyed poses and smears, and `puffs()` / `spark()` for the FX.

## Pitfalls
- Boil seeded by `t` instead of the drawing index flickers every frame and looks like noise → seed from `id % 4`.
- Evaluating motion at `t` while only boiling on 2s gives smooth movement with jittery lines → evaluate poses at the drawing's own time `tq`.
- Rendering at 30 fps breaks on-2s timing (frames don't divide evenly) → render with `--fps 24`; quantize with `Math.floor(t * 24 + 1e-4)`. A smaller epsilon can drop a frame when a tool passes a rounded time (0.333333 s × 24 = 7.99999).
- `ctx.stroke()` with a constant width looks vector → build a filled outline polygon with taper and pressure.
- Scaling the canvas to squash a shape also squashes the line weight → squash the points, not the context.
- Per-drawing tooth and grain inflate the file → keep the tooth to sparse specks (≤ 7 % of pixels) at ~50 % multiply, and the mottling static.
- A full-frame white "impact flash" on 1s is a seizure risk → use burst lines, sparks and a shake instead.
- This style is for shapes, type and FX. If the brief needs a character to act, switch to the cartoon-short workflow.

## Check on stills
- `sheet --strip 0:1 --fps 24`: frames 0–9 all differ (on 1s, the smear is frame 8 alone), then pairs repeat.
- `sheet --strip 4.7:5.0 --fps 24`: ball squash on the badge, radial burst lines, sparks, letters popping one per frame.
- `sheet --strip 6:7 --fps 24 --crop 560,60,800,800`: the held badge's outline boils, repeating every 3 drawings on the hold.
- `still --at 7.9`: off-register paint, tapered ink, paper tooth over everything; nothing looks vector-clean.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/05-cel-boil (MIT, Vincentwei1021). Written in our own words; no assets copied.
