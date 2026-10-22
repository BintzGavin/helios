# Bauhaus Poster

A kinetic constructivist poster: circles, triangles, squares and quarter discs on a strict module grid, printed in red, yellow, blue and black on warm paper, with one mechanical action per beat. **Not:** "flat geometric" stock motion with bouncy shapes, pastel palettes and pivots chosen at random.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Event and exhibition posters, music-driven brand loops, design-school or architecture openers, a title card that assembles itself | Canvas 2D: module-grid geometry drawn into per-ink knockout plates, printed with misregistration | Medium | a heavy geometric OFL sans (League Spartan, Poppins, Jost) |

Demo: [bauhaus-poster.html](bauhaus-poster.html) — `npx -y @helios-project/cli@latest render bauhaus-poster.html -o bauhaus-poster.mp4 --duration 8 --fps 30 --mode canvas`

## Look
- **Palette:** paper `#F1E9DA` (ground), red `#E03C31`, yellow `#F2B705`, blue `#1E4FA3` (the three primaries), black `#141414` (type, bars, key plate).
  - Rules: four inks and paper, nothing else. No tints, gradients or transparency.
  - Each shape is one flat ink. Red usually takes the largest area, blue the smallest. Black carries all type and the structural bars.
  - Inks knock each other out (no colour mixing), but black overprints colour, as a printer traps it.
  - Paper shows through as a fifth colour: leave whole modules empty.
- **Type:** one heavy geometric sans, 800–900 weight. **Cap height = exactly one module** (120 px ≈ 0.11 H): measure `actualBoundingBoxAscent` of "H" and scale.
  - Set the title vertically up one column, with tracking solved so its ink spans a whole number of modules (demo: 8).
  - Small caps at 15 px with +3.5 px tracking for the header, footer and counter. One 28 px line for the motto.
  - German or neutral copy suits the idiom. The text is construction information (sheet number, BPM, module size), not marketing.
- **Materials & texture:** printed on warm, slightly mottled paper.
  - Each ink is its own plate: an offscreen canvas where its shapes are drawn in ink and everyone else's in white (knockout).
  - The plates are multiplied onto the paper with 1–3 px of misregistration each. Black is the key plate at 0 offset.
  - Tiny voids are punched out of every plate (`destination-out` with a seeded speckle) where the ink didn't take.
  - Construction lines stay visible as faint hairlines under the ink.

## Motion
- **One action per beat** at 120 BPM (0.5 s): something drops, rises, slides one module, pivots 90° or splits. Never two unrelated actions on the same beat.
- **Easing:** `power2.inOut` (quadratic in-out) for slides, pivots and scales. `power2.in` for drops, so they land dead. **No overshoot, no settle, no spring.** The mechanical feel is the point.
- **Every displacement is an integer number of modules, and every rotation a multiple of 90°.** Landings sit on grid lines.
- **Pivots alternate** between three centres: a shape's own centre, one of its corners (quarter discs sweep about the corner they're cut from), and the frame or group centre.
- **Escapement:** big rotations ratchet in 12 detents of 7.5°. Each tooth moves in the last 65 % of its slot and then holds, so motion is fast mid-turn and visibly stepped at both ends.
- **Cascade:** a phase-shifted wave across a field, with delay = (col + row) × 0.075 s. Each tile turns 90° about its own centre.
- Hard on/off states (counters, captions, pops) are gated on frame-quantised time, `Math.round(t * fps) / fps`, so a gate never falls between two frames (or motion-blur sub-samples).
- Camera: locked. The poster is the frame. Allowed: a 2–3 % "press jolt" punch on the hero hit. Banned: dissolves, parallax, drift.

## Signature checklist
- [ ] Module = 120 px; every resting edge lies on `120 + n·120` (x) / `60 + n·120` (y).
- [ ] Exactly four inks + paper. Sample any pixel and it is one of them (± texture).
- [ ] Every action lands on a beat (multiple of 0.5 s), and no two unrelated actions start in the same beat. Multi-beat moves (escapement, cascade) are the only exceptions.
- [ ] Zero overshoot. In a strip, no shape passes its resting position.
- [ ] Title cap height = 120 px ± 2, and the title's ink length is a whole number of modules.
- [ ] One 90° group rotation shows 12 visible steps of 7.5°, with holds at each end.
- [ ] Plates are misregistered by 1–3 px (visible as paper or dark slivers at colour edges), struck tighter on the hero hit.

## Native moves
- **The escapement turn.** The whole quarter-circle field turns 90° about its centre like a ratchet: 12 audible-looking teeth, then a press jolt snaps the plates into register. Put it at the peak (demo: 5.0–6.0 s). *Fits:* "everything changes at once"; a reveal of the system's other face; a drop in the music.
- **Corner-pivot assembly.** Quarter discs sweep into their tiles about the corner they're cut from, one row pair per beat, until 2 × 2 blocks read as whole circles. *Fits:* a logo assembling; a team forming; a product built from modules.
- **Phase cascade.** A diagonal wave turns every tile 90° about its own centre and turns whole circles into a woven pattern. *Fits:* a transition between two states of a brand; a beat drop; "one rule, many results".

## Core technique
```js
// every shape goes to every plate: own ink on its plate, white knockout elsewhere (black overprints)
function paint(ink, path) {
  const x = PLATES[cur].ctx;
  if (ink !== cur && ink === 'K') return;
  x.fillStyle = ink === cur ? INK[ink] : '#FFFFFF';
  x.beginPath(); path(x); x.fill();
}
// per frame: draw scene into each plate, punch the tooth, multiply onto paper with offset
for (const k of ['R', 'Y', 'B', 'K']) {
  cur = k; clearToWhite(PLATES[k]); drawScene(t);
  plateCtx.globalCompositeOperation = 'destination-out'; plateCtx.drawImage(tooth, 0, 0);
  out.globalCompositeOperation = 'multiply'; out.drawImage(PLATES[k].canvas, reg[k][0], reg[k][1]);
}
// 12-detent escapement: eased progress quantised into 7.5° teeth
function escapement(t, t0, t1) {
  const x = io2(prog(t, t0, t1)) * 12, k = Math.min(12, Math.floor(x + 1e-9)), f = x - k;
  return 7.5 * (k + io2(clamp((f - 0.35) / 0.65))) * DEG;
}
```
Separating the inks is what makes it read as printed rather than "flat vector". Misregistration slivers and ink voids appear only where real plates would put them, and black traps over colour for free. The escapement turns a smooth eased rotation into machinery. In the demo, quarter-disc tiles are drawn as `moveTo(pivot) + arc(pivot, M, a0, a0 + 90°)`. Each pivot type only changes either the pivot point or `a0`.

## Pitfalls
- Overshoot or `back.out` "for life" → the style dies. Keep `power2.inOut`, and drop in with `power2.in`.
- Antialiased seams between quarter discs that should read as one circle → stroke each piece 1 px in its own ink (a 0.5 px trap).
- Off-grid landings after a group rotation → rotate square groups only, by multiples of 90°, about the group's centre.
- Mixing inks with transparency, or pastel tints → four opaque inks. Depth comes from overlap and knockout, never alpha.
- Tooth speckle too dense reads as snow, and dense 1 px noise bloats the H.264 file → ~9 k voids of 1–3 px at 20–70 % opacity.
- A counter or caption that pops between frames, or flickers in a chunked render → gate it on `Math.round(t * fps) / fps`.
- Determinism: textures from a seeded LCG in `ready`. Plates are cleared, and their transform and composite mode reset, every frame.

## Check on stills
- `still --at 7.9`: the grid hairlines line up with every edge, the title is exactly one module tall, and only 4 inks + paper are on screen.
- `sheet --strip 4.9:6.1 --fps 15 --crop 840,0,1080,1080`: the field holds, steps in teeth, holds again, then the cascade starts. No frame overshoots.
- `sheet --at 6.5 --crop 940,40,500,500`: misregistration slivers at colour edges and ink voids, with no colour blending where inks overlap.
- `sheet --every 0.5 --duration 8`: about one new action per cell through the build (0.5–4.5 s).

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/09-bauhaus (MIT, Vincentwei1021). Written in our own words; no assets copied.
