# Silkscreen

A poster being printed on camera: opaque, hard-edged flat inks laid one pull at a time, stepped colour bands instead of gradients, and thin slips of paper where the registration wanders. **Not:** flat vector art with a grain overlay, risograph (translucent inks, halftone dots), or a smooth gradient travel poster.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Event and festival posters, destination series, trail or venue guides, product drops in colourways | Canvas 2D + one `Path2D` per ink, revealed by a ragged squeegee clip | Medium | two Google Fonts (Big Shoulders Display, Outfit) |

Demo: [silkscreen.html](silkscreen.html) — `npx -y @helios-project/cli@latest render silkscreen.html -o silkscreen.mp4 --duration 8 --mode canvas`

## Look
- **Palette:** ≤ 6 inks per run, assigned by *role*, plus paper `#F1E6CF` (a colour in its own right: glints, beams, snow). Noon run: light sky `#D3E6EC`, sky bands `#7FB3C8`, far `#D9C7A3`, mid `#2F6E8E`, near `#173247` (darkest; also the info band and headline), accent `#E8553D`. Dusk run (same screens, re-inked): `#F6CD98 #EE9A73 #9A7FA8 #3E7079 #1E3B3F`, accent `#FBE6B4`. **Rules:** values step from far (light) to near (dark), depth is value, never blur. The accent is rare: the sun, the one landmark, the key number. Later ink covers earlier ink completely. Text ink is picked by contrast with the ink beneath it, never by a fixed key.
- **Type:** a condensed display face (Big Shoulders Display 800) for the header (~12 % of frame height, tracked +16 px) printed into the sky, and for the name and number in the info band (~8–10 %). A geometric sans (Outfit 600, ~2.5 %, tracked +5 px) for stat labels. The poster text *is* the subtitle: no floating captions; a spoken line would be another printed band.
- **Materials & texture:** cream stock with short fibres; a multiply mottle (soft blotches plus vertical drag streaks) at ~50 %; paper-coloured pinholes at ~75 % that only show on ink; a 1.6 px light rim top-left and dark rim bottom-right inside each ink (ink thickness); a faint multiply ghost of each ink offset ~2 px (the overprint lap). Fresh ink can carry a wet sheen that dries in under a second.

## Motion
- **Pulls are linear** (a squeegee does not ease): 0.3–0.5 s per ink, top to bottom, with a ragged front ~30 px deep. The blade, a round ink bead in the ink's colour and a sliver of wooden handle ride on the front.
- One ink, one beat: inks follow every ~0.45 s; the accent of a layer starts half a beat after its main ink.
- Info items print left to right on beat subdivisions (~0.15–0.25 s apart), each with a fast linear stamp-in (≤ 0.14 s).
- **No fades anywhere.** Change happens by pull, by re-ink, or by a cut through a foreground silhouette.
- **Palette re-ink:** a wide blade crosses the sheet diagonally in ~0.35 s; geometry is identical on both sides, only the inks change.
- Camera: locked top-down sheet with a slow push (≤ 3 %), or a truck with the squeegee. Never a rotation, never a dissolve.

## Signature checklist
- Every ink is offset 1–3 px from its neighbours, fixed per run (thin paper slivers or laps at shared edges).
- A multiply ghost ~2 px off under each ink, ~40 % opacity, visible as a darker sliver where ink overlaps ink.
- Skies are stepped: one solid band, then ≥ 5 stripes that thin (26 → 6 px) while the gaps widen; zero smooth gradients.
- ≤ 6 inks plus paper in any run; the accent covers < 5 % of the image.
- Each pull visibly reveals behind a ragged front with the blade and bead on screen for its whole 0.3–0.5 s.
- Palette re-ink lasts 0.3–0.4 s and changes colours only: shapes line up exactly across the blade.
- Paper border is never printed on; the image edge is the ink edge.

## Native moves
- **Palette re-ink.** The same poster pulled again in another run of inks: noon to dusk, summer to winter, colourway A to B. Put it at the peak. *Fits:* opening hours by season; three colourways of one product; a market by day and night.
- **One ink, one beat.** The picture builds layer by layer and the facts print last, exactly when they should be read. *Fits:* an event date and venue; a trail's distance and time; a price reveal.
- **Paper as a colour / a fresh pull.** A late, single pull of the accent (a lighthouse beam, a route line) lands on top of the finished print. *Fits:* the one route on a map; a spotlight on a product; a beam that says "open".

## Core technique
```js
function ink(path, color, reg, clip) {               // one pull = one opaque Path2D
  ctx.save(); if (clip) ctx.clip(clip); ctx.translate(reg[0], reg[1]);   // 1–3 px registration
  ctx.save(); ctx.translate(2.2, -1.6); ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = .4; ctx.fillStyle = color; ctx.fill(path, 'evenodd'); ctx.restore();  // overprint ghost
  ctx.fillStyle = color; ctx.fill(path, 'evenodd');  // holes in the path are knockouts
  ctx.restore();
}
function pullClip([x, y, w, h], p, seed, tail = 30) {   // printed = everything above a ragged front
  const front = y - tail + p * (h + tail * 2), c = new Path2D();
  c.moveTo(x - 10, -10);
  for (let s = -10; s <= w + 10; s += 6)
    c.lineTo(x + s, front - tail * hash(Math.floor(s / 6) * 7.13 + seed));
  c.lineTo(x + w + 10, -10); c.closePath(); return c;
}
// re-ink: print run A, then clip to the region behind a diagonal blade and print run B on fresh paper
```
Each ink is one `Path2D` filled opaque, so knockouts are just holes (`evenodd`) and stacking order is print order. The pull is a clip that grows linearly with t; once a pull finishes the clip is dropped. The re-ink reuses every path with the second palette inside a half-plane clip. Rims, mottle and pinholes are in `ink()` and `texFill()` in the demo.

## Pitfalls
- Using strokes for edge effects draws seams inside unioned shapes → fills only: fill, then fill an offset *inverse* path inside a clip.
- `evenodd` on a path with overlapping parts punches unwanted holes → keep overlapping shapes in separate paths or use `nonzero` for them.
- Smooth gradients sneak in through sky or haze → build stepped band paths.
- Eased pulls or faded text read as digital → linear pulls and clip stamp-ins only.
- Registration jittering per frame reads as camera shake → one offset per ink per run, derived from a seeded hash.
- Heavy mottle shows as stains on bare paper → keep it ≤ 55 % and fine-grained; pinholes in paper colour so they only show on ink.
- Textures or paths built inside `renderAt` make the first frame differ → build paths and pattern tiles in the `ready` promise; reset transform, alpha and composite mode every frame.
- Night palettes swallow dark headers → check text contrast against the ink under it for each run.

## Check on stills
- `sheet --strip` across the re-ink: blade on screen for ~8 frames at 24 fps, identical geometry either side.
- `sheet --crop` on an edge where two inks meet: 1–3 px paper sliver or darker overprint lap, a light rim top-left on the upper ink.
- Mid-pull still: ragged front, bead in the ink's colour, blade and handle sliver.
- Final hold: count the inks (≤ 6 + paper), find the accent in ≤ 3 places.

Source: adapted from lemo-opuscar (silkscreen-poster) — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/silkscreen-poster (MIT, LemoLab). Written in our own words; no assets copied.
