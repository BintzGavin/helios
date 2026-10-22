# Risograph

A frame printed on a stencil duplicator: two or three translucent spot inks on warm paper, each plate on its own halftone screen, overprints that mix into new colours, and plates that never quite line up. **Not:** flat vector art with a noise overlay, CMYK pop-art dots with a black keyline, or opaque screen-print poster inks.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Zines, indie brand spots, editorial covers, event and lifestyle teasers | Canvas 2D plate canvas (R/G/B = ink density) + raw WebGL2 print pass | Hard | two Google Fonts (Bricolage Grotesque, Jost) |

Demo: [risograph.html](risograph.html) — `npx -y @helios-project/cli@latest render risograph.html -o risograph.mp4 --duration 8 --fps 24 --mode canvas`

## Look
- **Palette:** paper `#F4EEE2` (warm ground, never pure white; also the highlight colour), ink 1 blue `#0078BF` (carries every silhouette and all type), ink 2 fluorescent pink `#FF48B0` (the sun, the scarf, the double-hit), ink 3 yellow `#FFE800` (sky tints, field, skin tints). **Rules:** 2–3 inks, never more; every other colour is an overprint (blue+yellow = green, blue+pink = violet) or a tint. No gradients except stepped halftone bands. Any one area uses at most two plates and at most one of them as a tint. Skin is a light tint of the palest ink. Keep the full three-ink overprint for the moment that earns it. Alternative set: teal `#00838A` + fluorescent orange `#FF7477` on `#F4EEE2`.
- **Type:** a heavy grotesque (Bricolage Grotesque 800) for titles at ~18 % of frame height, a geometric sans (Jost 500/700) for decks and captions at ~4 %. Type is *printed*: it lives on one plate and grains and misregisters with it. A title can be hit on two plates with a visible offset. Subtitles are a paper-white knockout strip (zero ink, small radius) with text on one plate.
- **Materials & texture:** the image is ink density, not colour. Paper fibre, ink grain on the dot threshold, pinholes in solids, vertical feed streaks and slow blotches all live in the print shader. Halftone dots are anchored to the paper, not to objects, so motion slides the image under a fixed screen.

## Motion
- Figures and secondary motion act **on twos** (`Math.floor(t * 12 + 1e-4) / 12`); the camera, if it moves, moves on ones. Render at 24 fps.
- **Registration is fixed per shot** (±1–3 px per plate). It moves only as analytic events: a **kick** of 8–14 px on an accent, decaying in ~0.25 s with slight ringing (`exp(-11x)·cos(34x)`), and a **drift** of up to ~25 px through a held beat that snaps home on the downbeat.
- Grain partly re-rolls once per print (12 fps, ~35 % boil); streaks and blotches only change at cuts.
- Plates **arrive** with a roller sweep (~0.55 s, ease-in-out, a heavier ink band on the front edge). Prints don't fade: things appear by sweep, wipe or cut and leave on a cut.
- Allowed transitions: roller sweep, overprint growth, shape match cut, hard cut on a beat. Banned: cross-dissolves, soft digital wipes, opacity fades.
- Camera: locked wide compositions (horizon, disc, small figure), slow lateral tracks, hard cuts between fixed zoom levels into the halftone until dots become shapes. A continuous push through magnified dots strobes and fails `helios check` (~9.5 flashes/s); if you must push, keep the dot contrast very low during the move. No stepped camera, no shake.

## Signature checklist
- Halftone period 7–9 px at 1080p, each plate at its own angle ≥ 15° apart (demo: 15° / 75° / 0°); densities ≥ 0.9 print solid.
- At least one visible third colour made by overprint (violet where the blue hill crosses the pink disc; green where blue meets yellow).
- Every plate visibly off register by 1–3 px at rest, revealing slivers of paper or coloured fringes on edges.
- Registration kick 8–14 px on each accent, settled within ~0.3 s; one drift-and-snap of ~20 px at the hero beat.
- A 4–6 px paper-white knockout halo around the figure, fringed by misregistered plates.
- Sky or shadow done in 3–4 stepped tint bands (e.g. 14 / 28 / 44 / 62 %), never a smooth ramp.
- ≤ 3 inks plus paper in every frame.

## Native moves
- **Plates as narrative.** The world gains a plate at each turning point: one-ink silhouette, then the sun's ink, then the field's. *Fits:* a product arriving as a new colour; a city history, one ink per era.
- **Drift and snap.** At the emotional peak, plates float apart for a held second, then clamp back into register on the downbeat while the title gets its second hit. *Fits:* nerves before a launch; a memory coming into focus; a reveal on the beat.
- **Two inks, a third where they meet.** Two shapes in two inks overlap and the overlap is the point. *Fits:* a merger; a duet; two data sets whose intersection is the finding.

## Core technique
```js
// 1) Draw densities, not colours: R = ink 1, G = ink 2, B = ink 3 (0..1 → 0..255).
const ink = (b = 0, p = 0, y = 0) => `rgb(${b*255|0},${p*255|0},${y*255|0})`;
g.fillStyle = ink(0, 1, 0); g.fill(sun);                 // source-over = knockout on every plate
g.globalCompositeOperation = 'lighter';                   // lighter = overprint into one channel
g.fillStyle = ink(.45, 0, 0); g.fill(farHills);           // 45 % blue over the sun → violet dots
g.globalCompositeOperation = 'source-over';
// 2) Print it (fragment shader, per plate i):
//   vec2 q = px - uOff[i];                      misregistration
//   float d = texture(plateTex, q / R)[i];      this ink's density
//   vec2 g = rot(uAng[i]) * px / 8.0;           screen anchored to the paper
//   float spot = 1. - (cos(6.2832*g.x) + cos(6.2832*g.y) + 2.) * .25;
//   float thr = spot + (grain - .5) * .16;      grain wobbles the dot threshold
//   float cov = max(smoothstep(thr-.07, thr+.07, d), smoothstep(.88, 1., d));
//   col *= mix(vec3(1.), uInk[i], cov * streak); inks multiply over paper
```
One 2D canvas holds all plates, so Canvas compositing gives you real knockouts and overprints for free; the shader turns each channel into dots of one ink and multiplies them over paper. The knockout halo is the same canvas: draw the figure on a layer, stamp it 12 times in a ring with `filter = 'brightness(0)'` (zero ink = paper), then draw it on top. See `drawPlate()` and `registration()` in the demo.

## Pitfalls
- Three halftoned plates on one area turn to mud → two plates per area, only one of them a tint.
- Jittering registration every frame flickers and bloats the file → one offset set per shot; kicks and drifts are analytic functions of t.
- Halftone period under ~7 px or dots of saturated ink on skin smear after 4:2:0 encode → period 8 px, check with `sheet --crop`; skin is a tint of the palest ink.
- Cheap `fract(p * big)` hashes draw stripes across solids at 1080p → use the `fract(vec3(p.xyx) * .1031)` hash family.
- Overprint drawn inside a transparent layer loses its meaning → do overprints with `lighter` on the plate canvas itself.
- The plate canvas is uploaded to WebGL every frame → create it with `willReadFrequently: true`, WebGL with `preserveDrawingBuffer: true`, and reset composite op and filter at the start of each frame.
- Grain seeded from frame count breaks when fps changes → seed it from `Math.floor(t * 12 + 1e-4)`.
- A main colour without the first ink floats loose before the other plates land → build recipes up from the one-ink silhouette (a deliberate blank, like the demo's field, is a reveal).

## Check on stills
- `sheet --crop` at 100 % on an overprint: round dots of two inks at different angles, no moiré, no smearing into flat colour.
- `sheet --strip` across an accent: the kick is visible for ~6 frames, then plates settle back to their fixed offsets.
- The figure has a paper halo with coloured fringes; the title edges show 2–3 px of misregistration.
- Count inks: nothing on screen that isn't paper, one ink, a tint or an overprint of the inks.

Source: adapted from lemo-opuscar (risograph) — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/risograph (MIT, LemoLab); press-pass ideas from mg-styles-15 (09-bauhaus) — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/09-bauhaus (MIT, Vincentwei1021). Written in our own words; no assets copied.
