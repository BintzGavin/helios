# Watercolor & Ink Wash

A journal page that paints itself: translucent brush strokes and pooled washes go down one by one on warm paper, structure first and detail last, with a handwritten note beside the thing being painted. **Not:** a vector illustration with a watercolour texture laid over it, or shapes that fade or scale in. Nothing is ever tweened as a shape here. Things get painted.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| nature and travel explainers, field-guide "specimen" reveals, calm brand stories, recipes and process pages | Canvas 2D + procedural brush engine (width-profiled ribbons, bristle tracks, 3-pass washes) | Medium | 2–3 Google Fonts (serif, handwriting, mono) |

Demo: [watercolor-ink.html](watercolor-ink.html) — `npx -y @helios-project/cli@latest render watercolor-ink.html -o watercolor-ink.mp4 --duration 9 --mode canvas`. A mountain, a wind-bent pine on a rock and a vermilion sun paint themselves onto a field-notes page. Set `VARIANT = 'ink'` at the top for the ink-wash version.

## Look
- **Palette (watercolour):** paper `#f1e9da` is the white. Dawn glow `#f3cfa4`, far range `#9fb4c4`, mountain `#5f7c97`, ridge edge `#3c4a59`, pine greens `#4e6e3c` / `#7f9c58` / `#2f4a2c`, bark and ink `#3d3129` / `#2b2520`, and **one accent**, vermilion `#b8382a`.
  - Rules: 3–5 hues per scene plus ink, and never paint white, because light is unpainted paper. Things get darker by adding passes, not by using a darker pigment.
  - The accent belongs to one recurring element, here the sun and the seal, which rhyme. Text and leader lines are ink only and never coloured.
  - Alternative (harbour at dawn): sky `#f3e2c8`, water `#9fb4c4`, hulls `#5f7486`, accent `#c8442a` buoys.
- **Palette (ink wash):** a single ink `#2b2520` in five tones by opacity: burnt **.96** for calligraphy, moss dots and the sharpest lines, thick **.82** for contours, heavy **.60** for secondary texture, light **.34** for mountain and body masses, clear **.16** for far ranges and mist. Add **one** vermilion `#b8382a` for the seal and at most one tiny story accent. No other hue, no red wash, no red type. Keep 60–80 % of the frame as empty paper.
- **Type:** an elegant serif (Cormorant Garamond 500) for the title at ~6.5 % of frame height, with an italic subtitle at ~2.8 %. Handwritten notes are Caveat 500 at ~4.3 %. Measured labels are IBM Plex Mono 400 at ~1.6 % with +3 px tracking. Text sits *on the paper*, never in a box: ink at 70–92 % opacity over a paper-coloured halo (a 7 px `strokeText` in the paper colour), revealed left to right like writing. Subtitles go centred at the bottom in serif italic, max 2 lines. In ink wash they are inscriptions in the empty paper, each line marked by a tiny vermilion square.
- **Materials & texture:** the paper is generated once in `ready`: a warm base, three octaves of soft mottling (tiny random canvases upscaled with smoothing), ~2,600 short curved fibres at 4–11 % opacity, and a light vignette.
  - Pigment glazes: each object is painted into an offscreen layer and composited onto the paper with `multiply`, so overlaps darken the way transparent paint does.
  - Washes dissolve downward into paper-coloured mist bands, and far is paler than near.

## Motion
- **Painting-in is the main motion.** Each object owns a progress window, and its stroke list splits that window so each stroke takes a slice of `max(.12, 4/N)`. The trunk lands before the branches and the branches before the needles. Inside a stroke, the tip advances along the centreline and the head is drawn at half width.
- Washes appear behind a **brush-edge wipe**: a wavy vertical clip edge (noise ±17 px plus a 23 px sine ripple) that sweeps across the shape in 1.2–1.5 s with `smoothstep`.
- Annotations follow the painting. The pen leader line grows in 0.6 s (ease-out cubic), then the note writes on over 0.9 s. A seal "thumps" from 1.25 to 1.0 in ~4 frames.
- **Sway only after an object is finished**, as a skew about its root: `k·(sin 1.15t + 0.4 sin(2.7t + φ))`, with k ≈ .006–.012 for trees and .01–.03 for grass. The end hold lives on sway, mist drift (0.35 rad/s) and slowly gliding birds.
- 24–60 fps on ones for watercolour. In ink wash, figures step **on twos** (`Math.floor(t*12+ 1e-4)/12`) while the camera, blooms and ripples stay on ones.
- Camera: a locked sheet, a slow lateral handscroll pan, a vertical tilt, or a slow push into a detail. When the camera pans or tilts, the paper and every layer canvas must be world-sized (the whole scroll, not 1920 × 1080), or the paper slides with the camera and layers clip at the old frame edge. Transitions are mist washes, ink blooms or page turns. **Banned:** hard cuts between unrelated pictures, cross-dissolves, spins and zooms with overshoot.

## Signature checklist
1. Every mark is a stroke: a ribbon with a **width profile plus ±22 % noise**, body at **~0.6 opacity** when bristles are present, plus **3–9 bristle tracks** at 30–85 % that break into dashes and stop early (at 72–100 % of the length).
2. Washes are **3 jittered passes at ⅓ opacity**, so edges visibly pool darker than the interior. No flat fills with clean edges.
3. **No pure white paint.** The lightest value anywhere is the paper. Highlights and the space around the peak are reserved (left unpainted).
4. **One accent hue** on ≤ 2 elements, or in ink wash, five ink tones (.96/.82/.60/.34/.16) and a single vermilion seal.
5. Objects paint in **structure → detail order**, and each finishes within ~1–1.5 s. Nothing fades in as a whole.
6. A **specimen + note**: a handwritten label with a pen leader line that grows to its subject and never covers it.
7. The end hold moves: sway ≤ 0.012 skew, drifting mist, and no new strokes in the final ~1 s.

## Native moves
- **The accent painted last.** Hold the page in neutral tones, then paint the one coloured element in a handful of fast strokes with a wet bloom spreading behind it. In the demo, seven horizontal strokes clipped by a disc make the sun at 61–69 % of the runtime. *Fits:* the moment of insight; the product finally named; a sunrise or a lantern lighting.
- **Reserve, then fill.** Paint the background *around* a shape that is not there yet (a `destination-out` of the future silhouette), so the white hole foreshadows it, then paint the shape into it. *Fits:* a reveal teased before it lands; a building on a skyline; a missing piece.
- **Flying-white gesture (ink).** After a held silence, one dry stroke made only of bristle tracks crosses the frame in 4–8 frames, and consequences start only once it has finished. *Fits:* a decision; a sprint finish; a cut or a signature.

## Core technique
```js
// one stroke: centreline resampled evenly, width = profile × (1 ± 22 % noise), bristles with
// dry-brush gaps stored in NORMALIZED arc length so they never crawl when redrawn or re-boiled
function mk(pts, w, role, seed) {
  const R = mulberry(seed), { P, L } = resample(pts, 5), ns = R() * 1000;
  const ws = P.map((_, i) => { const s = i / (P.length - 1);
    return w * PROF.brush(s) * (1 + .22 * (vnoise(ns + s * L / 26) * 2 - 1)); });
  const nb = w >= 6 ? Math.min(9, Math.max(3, Math.round(w / 3.2))) : 0, br = [];
  for (let j = 0; j < nb; j++) {
    const end = .72 + R() * .28, on = []; let s = R() * .05;
    while (s < end) {                                   // runs of 18–90 px, gaps of 1–(w/2+3) px
      const run = (18 + R() * 72) / L, gap = (1 + R() * (w * .5 + 3)) / L;
      on.push([s, Math.min(end, s + run)]); s += run + gap;
    }
    br.push({ off: (R() - .5) * .92, a: .3 + R() * .55, bw: w / nb * (.6 + R() * .7), on });
  }
  return { P, ws, br, role };
}
// draw(p): fill the ribbon up to index m = p·(n-1) at ~0.6 alpha, then each bristle's
// [s0,s1] runs clipped to m, offset along the normal by off·width.
```
Every stroke gets its **own seeded RNG** (`strokeSeed = strokeSeed*16807 % 2147483647`), so adding a stroke never reshuffles the others. The engine also needs a wash made of 3 jittered polygon passes with a top-to-bottom alpha gradient, and a layer canvas composited with `multiply`. Finished objects are cached as **sprites in `ready`** and only drawn stroke by stroke while they paint. See `mk`, `drawS`, `wash`, `drawWash`, `sprite` and `paintObj` in the demo.

## Pitfalls
- Building strokes inside `renderAt` from a shared RNG → every frame or worker draws different strokes. Build them all in `ready` with a per-stroke seed. If you must build one at render time (a boiling ink stroke on twos), seed it from its index and its quantized time step.
- Bristle gaps set with `setLineDash` in pixels → the gaps slide along the stroke whenever its length or boil changes. Store the gaps in normalized arc length × a fixed reference length.
- Context state leaking between frames: a `destination-in` or `multiply` left on an offscreen layer silently erases the next frame. Reset `globalCompositeOperation`, `globalAlpha` and the transform on **every** canvas you reuse, not only the main one.
- A wash polygon with vertical sides or a flat bottom inside the frame shows a hard seam. Extend it past the frame edges, or taper it and fade its gradient to 0 before the polygon ends.
- Fine fibres and 1 px bristles smear or shimmer in H.264. Keep bristles ≥ 0.7 px, keep fibres soft, and render the final with `--preset medium`. Static paper grain is fine; animated per-frame grain bloats the file.
- Painting thousands of strokes per frame is slow. Sprite-cache finished objects, and only redraw the one being painted.
- Colouring the type or adding a second accent → it stops reading as a journal. Keep text in ink and give the accent to one recurring thing.

## Check on stills
- `still --at <end>`: is the lightest value paper (no white paint)? Is there one accent hue? Do the wash edges look pooled rather than clean?
- `sheet --crop 900,300,500,300 --at 3.5`: zoom on a ridge stroke and check for broken bristle tracks, an early end and uneven width.
- `sheet --strip 3.9:5.4 --fps 12`: the pine's trunk should land before its branches, and the branches before the needles.
- First frame: a wash is already moving, not blank paper. Last second: only sway, mist and birds move.

Source: adapted from lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/watercolor and https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/ink-wash (MIT, LemoLab). Written in our own words; no assets copied.
