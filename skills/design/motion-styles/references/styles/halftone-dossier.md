# Halftone Dossier

A retro case file read out one exhibit at a time: cream archive paper, overprinted halftone dots in a few flat inks, huge slab headlines with misregistered shadows, thick-outlined suspects that boil, and rubber stamps that slam. **Not:** risograph (no grainy two-ink texture as the whole look), clean Swiss kinetic type, or candy-coloured game-show flat.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Explainers framed as "the case of X", myth-busting, listicles of causes, product or bug "mugshots" | SVG (halftone circle paths, `feTurbulence` filters) + a multiply paper canvas | Medium | four Google Fonts (Alfa Slab One, Bagel Fat One, Archivo 900, JetBrains Mono 800) |

Demo: [halftone-dossier.html](halftone-dossier.html) — `npx -y @helios-project/cli@latest render halftone-dossier.html -o halftone-dossier.mp4 --duration 8`

## Look
- **Palette:** paper `#F4ECDD` (ground) · navy `#1D2340` (the one dark ink: outlines, headlines, caption bar, edge dots) · cobalt `#2E55D6` (halo dots) · hot pink `#FF5A87` (overprint shadow ink: headline and caption offsets, corner dots) · yellow `#FFC628` (highlight: keywords, numerals) · red `#E8384F` (reserved for stamps and alarms). **Rules:** flat inks only, no gradients or opacity ramps; tone comes from dot size and multiply overprint. At most five inks plus paper. A character may own one or two local colours (the demo's terracotta pot and mint leaves) that appear nowhere else. Alternative: manila `#E9DCC0` / sepia-black `#2A2018` / teal `#1F8A86` / mustard `#E0A526` / vermilion `#D8432C`.
- **Type:** black slab for headlines (Alfa Slab One, 8–15 % of frame height), left-aligned near the margin, with a pink multiply shadow at +8/+8 px. A fat rounded display (Bagel Fat One) for giant exhibit numerals that may bleed off frame. Heavy mono (JetBrains Mono 800, ~2.4 %) for case numbers and clocks. Black sans (Archivo 900, ~4.3 %) for captions and stamps. **Cards are the subtitles:** one headline per beat plus a caption bar: a navy rounded pill, pink offset shadow, cream text, keyword in yellow.
- **Materials & texture:** the whole frame is printed paper: an upscaled random tile for mottling, per-pixel noise, a vignette and a centre fold, multiplied over everything (built once). Dust specks in paper and ink colour re-seed at 15 fps. Halftone is circles on a rotated grid, one path per layer.

## Motion
- Transforms on ones at 30 fps. **Line boil at 10 fps** on characters and hand-drawn props only (reseed `feTurbulence` from `Math.floor(t * 10)`).
- **Everything enters with overshoot** (back ease, `c1 = 1.70158`, 0.3–0.45 s), rising from below or scaling up. Nothing fades in.
- Headlines pop per glyph: drop 80 px with a 1.25 → 1 squash, stagger 0.03–0.06 s.
- **Stamp slam:** 2.6× → 1× in 0.09 s (ease-in cubic), then a 5 % damped bounce (`sin(30x)·exp(-9x)`); camera shake (20 px, quadratic decay over 0.4 s) and one small flash on the same frame.
- Squash landings preserve volume: `scale(1/sq, sq)` with a damped cosine.
- Idle life in holds: leaf sway, scripted blinks, a REC dot blinking at 1 Hz, a 0.6 % beat pulse every 0.5 s.
- Transitions: **dot wipe** (a coarse grid of circles grows to cover / shrinks away in ~0.25–0.45 s with a diagonal delay) or a hard cut on a big hit. No dissolves.

## Signature checklist
- Halftone step ≥ 20 px (never < 14 px), two or three dot layers at different screen angles (demo: 20° / 60° / 70°, numeral fill 25°), at least one multiplied over another.
- Headline shadow offset exactly +8/+8 px in the overprint ink, multiplied.
- Stamp reaches scale 1.0 within 0.09 s of appearing, rotated ±6–12°, ~93 % opacity with rough, mottled edges.
- Boil visible on the character outline (≈ 5–6 px displacement) and absent from every text, dot and HUD element.
- A caption bar with exactly one highlighted keyword, holding ≥ max(1.8 s, speech + 0.6 s).
- HUD in the corners: case number + chapter chip top-left, REC dot + clock top-right.
- Any flash ≤ 0.35–0.5 white, ≤ 0.12 s, at most once per second.

## Native moves
- **The stamp.** The verdict is a physical slam with shake, flash and a bloom of dots. Put it at the peak. *Fits:* APPROVED on a grant; EXPIRED on a policy; DEBUNKED on a rumour.
- **Numbered exhibits.** Each beat gets a giant halftone-filled numeral behind its subject. *Fits:* five causes of an outage; three clauses of a contract; steps of a recall.
- **Dot density = emotion.** Edge dots crowd in as tension builds and relax after the verdict; a halo blooms on the reveal. *Fits:* a deadline closing in; a record broken; a sigh of relief.

## Core technique
```js
// Halftone: circles on a rotated grid, radius from a density field f(x,y) ∈ 0..1.
function halftone(f, { x0 = 0, y0 = 0, w = 1920, h = 1080, step = 22, angle = 15, k = .66 }) {
  const a = angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const n = Math.ceil(Math.hypot(w, h) / step / 2) + 2; let d = '';
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const u = i * step, v = j * step, x = x0 + w/2 + u*ca - v*sa, y = y0 + h/2 + u*sa + v*ca;
    if (x < x0 - step || x > x0 + w + step || y < y0 - step || y > y0 + h + step) continue;
    const s = Math.min(1, f(x, y)); if (s < .06) continue;
    const r = (s * step * k).toFixed(1);   // k ≈ .7 → neighbouring dots merge into solid
    d += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0`;
  }
  return d;                                 // one <path d> per ink layer; add class="mul" to overprint
}
const radial = (cx, cy, R, pw) => (x, y) => Math.pow(Math.max(0, 1 - Math.hypot(x-cx, y-cy) / R), pw);
// per frame: boilT.setAttribute('seed', 1 + Math.floor(t * 10) % 40);
```
Each ink layer is one SVG path of circles whose radius follows a density function, so a field that changes with t (a growing halo, crowding edges) is just a new `d` each frame. Halftone-filled numerals are a yellow glyph plus a darker dot path clipped by the same glyph (`clipPath` with a unique id). Boil and stamp roughness are `feTurbulence` + `feDisplacementMap` filters with fixed seeds, the boil seed stepped from t.

## Pitfalls
- Dots under ~14 px step alias into moiré after encoding → 20–26 px, and check with `sheet --crop`.
- Boil on text or dots turns them to mush → apply the filter to the character group only.
- Clip-path ids are document-global → give every clipped numeral its own id.
- Glyph positions measured before fonts load overlap → `await document.fonts.load(...)` for every family and string, then measure and build in `ready`.
- A full-strength white flash reads as a dropped frame and can trip the flash checker → cap at ~0.35–0.5 for ≤ 0.12 s, never more than 3 per second.
- A dot wipe that never reaches full cover shows the cut → max radius ≥ half the cell diagonal (grid 96 → r 70).
- HUD text over dense edge dots disappears → give corner chips a cream or navy backing.
- Boil seeded from a frame counter breaks at other fps → seed from `Math.floor(t * 10 + 1e-4)`.

## Check on stills
- `sheet --crop` on an overprint: round dots of two inks at different angles, the multiply colour where they overlap.
- `sheet --strip` across the stamp: big and faint on the first frame, settled with a small bounce by frame 3–4 at 30 fps, shake decaying over ~12 frames.
- Two stills 0.1 s apart: character outline wobbles, headline and dots do not.
- Every frame shows paper, dots and at least one piece of case-file apparatus.

Source: adapted from lemo-opuscar (halftone-dossier) — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/halftone-dossier (MIT, LemoLab). Written in our own words; no assets copied.
