# Woodcut

A relief print that carves itself: every frame is a black block of wood, and light exists only where a knife has cut it away, with at most one colour plate glowing out of the cuts. **Not:** a photo pushed through a threshold filter, copperplate engraving built up from white, or flat-colour linocut poster art.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Origin stories, craft and labour, sombre or historical explainers, "first light" reveals | Canvas 2D carve mask (white = cut) + a print pass (raw WebGL2 in the demo; a Canvas 2D pass with procedural texture also works) | Hard | a Google Font (IM Fell English / IM Fell English SC) |

Demo: [woodcut.html](woodcut.html) — `npx -y @helios-project/cli@latest render woodcut.html -o woodcut.mp4 --duration 8 --fps 24 --mode canvas`

## Look
- **Palette:** ink `#111111` (the uncut wood), paper `#EFE8D8` (everything carved, plus the margin), and **at most one colour plate**: burnt copper `#C8502A` in the demo. **Rules:** two values carry the picture. The colour plate prints only where wood was carved (it is invisible over ink, so plan it on white), with a small fixed misregistration (~3, 2 px). Reserve it for the one thing that burns: a sun, a flame, molten metal, a lamp. It may spread at the peak and shrink back later; it is never decoration. Alternatives for the plate: Prussian blue `#1F3A5F` for water or night, oxblood `#6E1E1E` for a seal or a wound.
- **Type:** captions are **letterpress in the paper margin** below the block (IM Fell English italic, ~4 % of frame height, centred), with small caps (IM Fell English SC, ~2.6 %) for a press name and plate number in the corners. They never sit on the image. Titles, if any, are carved into the block.
- **Materials & texture:** a black block with a ragged hand-cut edge inside a fixed paper margin. Cuts have a blunt entry, a long tapered exit and chipped edges. The print adds a knife burr on every edge (displaced, noisy threshold), ±4 % ink density, faint wood-grain streaks, specks where ink didn't take, laid-paper fibre, and a mottled colour plate.

## Motion
- **Carve reveal:** every stroke has its own start time and a speed from its length, clamped to **0.08–0.35 s** per cut, so the picture grows cut by cut. Order follows light: the first long knife line, then form hatching, then the brightest cuts, the rays last.
- Characters and small life (smoke, birds) **on twos**: `Math.floor(t * 12 + 1e-4) / 12`. Fire, smoke and liquids are re-cut every 2 frames as deliberate boil; everything else stays put (hatching lives in object space).
- The print's per-impression noise steps on twos through a small cycle, so edges breathe without crawling.
- Captions: ink comes up in 0.1 s with no slide, leaves over 0.15 s.
- Transitions: a hard cut is a new impression (2 frames of a few px misregistration); the signature transition is the paper peel. Never a dissolve.
- Camera: locked plate, slow push on a detail, or a pull-back as cuts spread. **The margin never moves.**

## Signature checklist
- Only ink, paper and ≤ 1 colour; colour visible only inside carved areas.
- Hatching **direction follows form** (furrows converge on the light, hill contours follow the ridge, rays radiate) and **width follows tone**: bright = wide cuts up to 12–30 px merging into white, dark = no cuts.
- Far = fine and dense, near = coarse (demo furrows 1.2 px at the horizon → ~11 px at the front).
- Every cut is 30–220 px long with gaps between cuts; no continuous machine lines.
- A 2–4 px white knife halo separates black figures from black ground (house, ridge).
- Each cut appears over 0.08–0.35 s; the colour plate spreads over ~1 s at the peak.
- Captions only in the bottom margin, ≥ 40 px.

## Native moves
- **Light is carved.** A burst of radial cuts from one point, with the colour plate flooding the new white. The emotional peak. *Fits:* a power grid switched on; a breakthrough; a lighthouse relit.
- **Carving = time.** Patient labour shown stroke by stroke: the world exists only as far as the knife has reached. *Fits:* a year of training; a building rising; an apprenticeship.
- **Mirrored block → true print.** A backwards carved word reads true when the sheet is pulled. *Fits:* a verdict; a name cleared; a misunderstanding put right.

## Core technique
```js
// mask: white = carved. Each cut is a tapered polygon drawn up to progress pr ∈ 0..1.
function carve(s, pr) {                       // s = { p:[[x,y]...], w:[...], seed }
  const C = cumulativeLengths(s.p), L = C.at(-1), Lv = L * pr, left = [], right = [];
  for (let i = 0; i < s.p.length && C[i] <= Lv; i++) {
    const [dx, dy] = unitTangent(s.p, i), w = s.w[i];
    const entry = clamp(C[i] / (.9 * w + 1)), exit = clamp((L - C[i]) / (2.6 * w + 2));
    const hw = w / 2 * (.35 + .65 * entry * (2 - entry)) * exit ** .75   // blunt in, tapered out
             * (1 + .16 * (hash(s.seed * 7 + Math.floor(C[i] / 9)) - .5)); // chipped edge
    left.push([s.p[i][0] - dy * hw, s.p[i][1] + dx * hw]);
    right.push([s.p[i][0] + dy * hw, s.p[i][1] - dx * hw]);
  }
  M.beginPath(); polygon(M, [...left, ...right.reverse()]); M.fill();    // one fill per cut
}
// strokes built once in `ready`: walk a direction field, width = wmax * tone(x,y)^γ,
// split into 40–200 px cuts, t0 from the reveal order, dur = clamp(len / speed, .08, .35)
for (const s of strokes) { const pr = clamp((t - s.t0) / s.dur); if (pr > 0) carve(s, pr); }
```
All the drawing is about the mask; the look comes from carving white out of black with tool-shaped strokes whose width is the tone. The print pass then turns mask + colour plate into ink on paper with a burred edge. See `buildStrokes()`, `drawMask()` and the fragment shader in the demo.

## Pitfalls
- White cuts on white areas are invisible → stab cuts, smoke and birds need dark masses behind them.
- Hatching every surface reads as fur or rain → light from one side; cut only the lit edge of a form (3–15 lines), leave the rest black.
- Filling all cuts as one path cancels overlapping cuts of opposite winding → `fill()` each cut separately.
- The colour plate leaking into the margin through the ragged block edge → inset it ~8 px from the block.
- Short hatch segments with a tonal wobble zig-zag into chevrons → long cuts along a smooth direction field.
- Fine cuts + ink noise + grain bloat the file and smear → keep cuts ≥ 1.2 px at the far end, step impression noise on twos, check a 1:1 `sheet --crop`.
- Strokes generated inside `renderAt` or cached lazily differ between workers → generate all strokes from a seeded RNG in `ready`; only the re-cut boil uses `Math.floor(t * 12)` as its seed.
- Both canvases are uploaded to WebGL each frame → `willReadFrequently: true`, `preserveDrawingBuffer: true`, reset the mask context every frame.

## Check on stills
- `sheet --crop` 1:1 on hatching: burred edges, tapered cut ends, no grey anti-aliased mush.
- A mid-reveal still shows cuts at different stages, some with a live tapered tip.
- Squint test: the brightest area (most carving) is where the story's light is; the colour sits only in white.
- The margin is clean paper except for the captions; the block edge is ragged.

Source: adapted from lemo-opuscar (woodcut) — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/woodcut (MIT, LemoLab). Written in our own words; no assets copied.
