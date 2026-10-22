# Spy Titles

A 1960s-style cut-paper opening title: four flat inks, scissor-cut edges, silhouettes in profile, and credits that are the set, the stairs and the skyline, cut on every brass stab. **Not:** clean flat-vector motion graphics with perfect edges, nor a spy parody with gun barrels and gadgets.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Title sequences and openers, event or conference line-ups, product feature reels with a "chase", trailers and credits | Canvas 2D: glyph outlines + polygons re-cut once in local space, silhouette rig on twos, camera on ones | Hard | opentype.js (CDN, exact version) + a condensed OFL face file (League Gothic via @fontsource) |

Demo: [spy-titles.html](spy-titles.html) — `npx -y @helios-project/cli@latest render spy-titles.html -o spy-titles.mp4 --duration 9 --fps 24 --mode canvas`

## Look
- **Palette:** four inks, for example black `#1b1714`, cream `#efe4c9`, red `#d23a22`, mustard `#e2a52a`, plus darker "shadow paper" versions of the grounds for background props (`#b3311d`, `#ddd0b2`).
  - Rules: **one dominant ground per location** (the demo cuts red → cream → mustard). Figures and type use the other inks.
  - Red is reserved for the hero's single accent (a scarf that streams back when running) and for danger (the giant disc). Mustard marks the object of the chase.
  - Background props use the darker ground, **never black**, or they read as letters.
  - The object always sits on a black backing, so it reads on any ground, its own colour included.
  - Alternatives: ink `#161a22` / bone `#ece6d6` / teal `#1f8a8a` / orange `#f07a28`; black / pale pink `#f3d6cc` / cobalt `#2a46b8` / lemon `#f0d23a`.
- **Type:** a condensed display face (League Gothic) for every credit. Glyph outlines come from opentype.js and are **re-cut per letter**: edge noise, ±0.8° tilt, ±1.5 px baseline jitter, so each letter looks scissored.
  - Sizes: the location credit 0.4 H (430 px caps), staircase letters 0.16 H, title 0.16–0.3 H, small credits 0.03–0.06 H.
  - Credits are fictional roles or an invented studio, never real people. Each credit line is fully readable at some moment: open wide, then truck in.
  - Captions or subtitles, if any, go on a tilted paper strip with scissor-cut ends, bottom-left, never a clean bar.
- **Materials & texture:** cut paper layered on a board.
  - Every edge is resampled every ~9 px and pushed along its normal by low-frequency noise (1–2 px, larger for big shapes), with a rare 1–2 px notch.
  - Pieces are separated by a **2.4 px cut gap** in the ground colour and cast a small paper shadow (offset 2.5/3.5 px, blur 5, 30 %).
  - One multiplied paper texture (mottling + fibres) and a sparse "ink void" speckle cover the whole frame.

## Motion
- **Puppets and letters on twos** (12 fps): figure poses, figure positions, letters landing, the scarf. **Camera and credit slides on ones** (24 fps): a stepped camera reads as judder.
- Run cycle: 8 drawings (0.67 s per stride pair), strong forward lean of 0.34 rad, arms bent at the elbow, scarf trailing. Hops: crouch → leap → crouch, one per 0.28 s.
- Letters drop or slide along grid lines and **stop dead** with a short ease-out (cubic, 0.17–0.25 s), staggered by 1/12 s, landing on the beat.
- **Hard cuts on stabs** are the only transitions (demo: 3.5 s, 6.5 s). No dissolves, no wipes with soft edges.
- **Stop-time:** on a stab, the whole picture freezes for 0.5 s, camera included, then resumes from where it stopped.
- Camera grammar: wide on a full credit line, then truck in and track laterally in one screen direction. Also allowed: a locked shot on a giant circle, a diagonal (~30°) framing. Never handheld, never rotating.

## Signature checklist
- [ ] Exactly four inks (+ the darker ground variants for props). Count them on any still.
- [ ] Every edge is wobbly at ~9 px wavelength and 1–2 px amplitude, and **the same wobble on every frame** for a moving piece (no edge crawl).
- [ ] A 2.4 px gap in the ground colour separates overlapping pieces, including around the whole silhouette.
- [ ] Figures change pose only every 2nd frame at 24 fps, while the camera moves every frame.
- [ ] At least one credit line is the set itself (letters as rooftops or stairs) and is fully readable for ≥ 0.4 s.
- [ ] One stop-time freeze ≥ 0.4 s, in which no pixel changes.
- [ ] The object of the chase (mustard, black backing) becomes part of the title in the final shot.

## Native moves
- **Type is the set.** The courier runs along the rooftops of a 430 px credit line, then hops up a staircase made of the letters of the next credit. *Fits:* a conference programme as a city; a menu as a restaurant; team names as a skyline.
- **Stop-time on a stab.** Mid-leap, silhouetted against the red disc, everything holds for 0.5 s, then the leap completes. This is the demo's peak (5.5–6.0 s). *Fits:* a near miss; a price reveal; the one-line punchline of a launch.
- **The object becomes the title.** The key everyone chases drops into the empty "I" of the title on the last stab. *Fits:* a product launch name; a book title; a birthday name.

## Core technique
```js
// scissor cut: resample, push along the normal by seeded low-frequency noise. Do it ONCE per piece in ready.
function rough(pts, seed, amp = 1.6, step = 9) {
  const out = []; let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    const nx = -dy / L, ny = dx / L, k = Math.max(1, Math.round(L / step));
    for (let j = 0; j < k; j++) {
      const ss = s + j / k * L, w = j === 0 ? 0.25 : 1;            // corners stay sharp
      const o = ((vnoise(ss / 21 + seed * 17.3) * 2 - 1) + 0.35 * (vnoise(ss / 5 + seed) * 2 - 1)) * amp * w;
      out.push([a[0] + dx * j / k + nx * o, a[1] + dy * j / k + ny * o]);
    }
    s += L;
  }
  return out;
}
// draw: cut gap in the ground colour, then paper with a small shadow
function piece(polys, col, ground) {
  path(polys); ctx.lineWidth = 2 * 2.4 / camScale; ctx.strokeStyle = ground; ctx.stroke();
  ctx.shadowColor = 'rgba(20,12,6,.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetX = 2.5; ctx.shadowOffsetY = 3.5;
  ctx.fillStyle = col; ctx.fill('evenodd');
}
```
The roughened polygon lives in the piece's **local** coordinates: glyph origin, or bone space for a limb. Then `translate/rotate` moves it, and the cut never crawls. Roughening in screen space every frame "boils" and reads as cheap. For figures, draw all bones in black into an offscreen layer so they merge into one silhouette. Tint a copy with `source-in` to the ground colour, and stamp it at 8 offsets of 2.4 px for the outline gap. See `hero()` and `glyphPolys()` in the demo.

## Pitfalls
- Roughening inside `renderAt` (or lazily caching on first use) → edges crawl, or a chunked render differs. Build every rough polygon in `ready`.
- Each limb outlined with its own gap looks like a mannequin diagram → merge the figure in a layer, and outline only the union.
- A credit only ever seen cropped → open wide on the full line for ≥ 0.4 s before trucking in.
- The object in the same ink as its ground vanishes → black keyline / backing.
- `sCapHeight` missing or wrong in some font files → measure the "H" glyph's bounding box for the cap height.
- Stepped camera → camera on ones, puppets on twos: `twos = t => Math.floor(t * 12 + 1e-6) / 12`.
- Flat inks + full-frame grain bloat the encode → keep the speckle sparse (~5 k dots) and the texture static. Use `--preset medium` for the final file.
- Text drawn as polygons is invisible to `verify --cues` → call `window.heliosDrawnText?.add(...)` if you check captions.

## Check on stills
- `sheet --strip 5.25:6.3 --fps 12`: frames from 5.5 to 6.0 are identical (stop-time), then the leap continues.
- `sheet --at 2.4 --crop 700,300,600,500`: letter edges are scissor-rough with sharp corners; the silhouette has a ground-coloured gap and a soft paper shadow.
- `sheet --strip 2.0:2.5 --fps 24 --crop 600,100,700,500`: the figure changes pose every other frame while the letters slide every frame, and edges don't shimmer.
- `still --at 8.9`: the title reads "THE QUIET COURIER", with the key as the I, the hero on the last R and the scarf moving.

Source: adapted from lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/spy-titles (MIT, LemoLab). Written in our own words; no assets copied.
