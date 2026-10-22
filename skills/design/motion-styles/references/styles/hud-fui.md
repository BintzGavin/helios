# HUD / FUI

A fictional cockpit interface that builds itself in hierarchical order, hunts, and locks: hairline cyan rings, a radar sweep, rolling numbers and typed logs on dark plates, and one warm alert colour spent only on the lock. **Not:** a busy wallpaper of random sci-fi widgets, everything glowing at once, or orange used as decoration — a good HUD is restrained, legible and tells one story (search → find → lock).

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| Tech product reveals, "system online" intros, data or security explainers, game/esports bumpers | Canvas 2D drawn into an offscreen HUD layer, then additive blur glow + 3 px scanlines | Medium | Rajdhani + Share Tech Mono (Google Fonts) |

Demo: [hud-fui.html](hud-fui.html) — `npx -y @helios-project/cli@latest render hud-fui.html -o hud-fui.mp4 --duration 8 --mode canvas --preset medium`

## Look
- **Palette:** stage `#06272b` (radial lift) → `#031417` → `#010506` at the corners; hex grid at `rgba(0,229,255,.05)`; line colour cyan `#00e5ff` in three alpha levels (1.0 active, ~0.55 secondary, ~0.3 hairline); heat `#d8fbff` for the sweep line, live values and one-frame impacts; plates `#020c0e` at 78 % alpha; alert `#ff6a00`.
- **Colour rules:** one cold hue does everything. The alert colour appears **only from the lock frame on** and only on the things the lock concerns (brackets, lock labels, the top status plate, the range value, the matching candidate row). White is heat, used sparingly. Alternative pairing: mint `#3dffc0` + red `#ff3b3b`, or ice `#9fd8ff` + amber `#ffb000` — always one hue + one alert.
- **Type:** Rajdhani 700 for the product name (30 px, tracking 3), the status plate (22 px, tracking 6) and the hero number (92 px ≈ 0.085 H); Share Tech Mono 13–20 px for every data line, monospaced so rolls never jitter. Panel titles in Rajdhani 700, 15 px, tracking 4, uppercase. Captions belong on a plate like any other text — never floating on the scope.
- **Materials & texture:** everything is light on dark glass: 1–2 px strokes, a blurred copy of the whole HUD added on top (`filter: blur(7px)`, `lighter`, 70 %), 3 px scanlines at 16 % black. Every text block sits on a **dark plate** with a hairline border and 14 px corner ticks, so text never sits on linework.

## Motion
- **Hierarchical draw-on:** frame corners (0.12 s) → title (0.2) → outer ring stroked on over 0.6 s (0.3) → ticks (0.55) → segment arcs (0.7) → inner rings and crosshair (0.8–1.0) → left panel (0.9) → right panel (1.15) → radar sweep (1.3) → data alive (2.0+). Each element enters with the **4-frame power-on flicker** `[.55, .3, .9, .6]` then holds at 1.
- **Data:** digits roll for 3–7 frames on hashed values (`hash(id, i, frame)`) then settle; logs type at 60–70 chars/s with a block cursor blinking at 1.2 Hz; sparklines draw on left to right and refresh at 10 fps.
- **Continuous motion:** ring ticks rotate 6°/s, segment arcs counter-rotate at 12°/s, radar sweep at 180°/s, heading ruler drifts with `easeInOutCubic`. Nothing else drifts.
- **The lock:** search box hops between candidates (ease-out 0.2 s per hop) → brackets fly in **scale 1.4 → 1.0 and 25° → 0°** with `easeOutCubic` over 0.25 s, white-hot for 3 frames, then alert orange, plus one expanding ring pulse (0.6 s).
- **Banned:** crossfades between layouts, camera shakes, full-frame flashes, glitch on every beat.

## Signature checklist
1. Build order is visible on a 0.5 s contact sheet: corners → rings → panels → sweep → data (≥ 5 distinct layers by 2 s).
2. Power-on flicker lasts exactly 4 frames per element and never drops below 30 % (flash-safe for small, staggered elements).
3. Every rolling number settles within 3–7 frames; settled values never change again unless the state changes.
4. Lock brackets: start at 1.4× size and 25° rotation, settle at 1.0× in 0.25 s; 3 white frames then alert colour.
5. Alert colour covers < 5 % of the frame and appears on no element before the lock frame.
6. All text sits on a plate at ≥ 75 % opacity; line weights ≤ 3 px (except hero type).
7. Scanline period 3 px; glow is a blurred copy (≈ 7 px) added, not a `shadowBlur` on each element.

## Native moves
- **System boot.** The interface draws itself in hierarchy while a log types `[OK]`s. *Fits:* a product or service coming online; the start of a demo; a "ready" state.
- **The hunt and the lock.** A dashed search box hops across candidates ("NO MATCH"), then brackets slam onto the target, the status plate flips to `TARGET LOCKED`, and the hero number rolls into the alert colour. *Fits:* the video's peak — finding the answer, the match, the chosen plan.
- **Rolling truth.** A value scrambles for a few frames and lands on the real figure. *Fits:* a spec, a price, a score, a distance.

## Core technique
```js
const frameOf = t => Math.floor(t * 30 + .5);
const flick = (t, t0) => { if (t < t0) return 0; const f = frameOf(t) - frameOf(t0); return f >= 4 ? 1 : [.55, .3, .9, .6][f]; };
const roll = (t, t0, fin, id, n = 4) => { if (t < t0) return ''; const f = frameOf(t) - frameOf(t0); if (f >= n) return fin;
  return [...fin].map((c, i) => /\d/.test(c) ? String(Math.floor(hash(id, i, f + 3) * 10)) : c).join(''); };
// lock: brackets fly in 1.4 -> 1.0, white for 3 frames, then alert
const e = outC((t - LOCK) / .25), f = frameOf(t) - frameOf(LOCK);
brackets(x, y, 44 * lerp(1.4, 1, e), 16, f < 3 ? HOT : ALERT, lerp(.4, 1, e), lerp(25, 0, e) * DEG);
// compose: stage, additive glow of the whole HUD layer, sharp HUD, scanlines
out.drawImage(BG, 0, 0);
out.globalCompositeOperation = 'lighter'; out.filter = 'blur(7px)'; out.globalAlpha = .7; out.drawImage(hudC, 0, 0);
out.filter = 'none'; out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; out.drawImage(hudC, 0, 0);
out.drawImage(SCAN, 0, 0);
```
Everything discrete (flicker, rolls, typing) is indexed by `frameOf(t)`, so motion-blur sub-samples and re-renders agree. The HUD is drawn once per frame into its own canvas and glowed as a whole, which keeps glow consistent and cheap. See `scope()`, `target()` and `panels()` in the demo.

## Pitfalls
- Using the alert colour for decoration (even a red REC dot) → it stops meaning "locked"; audit every use against the lock frame.
- `Math.random()` for rolling digits → `verify` fails; hash `(id, digit index, frame)`.
- `shadowBlur` on hundreds of strokes → slow and uneven; glow the whole layer once with a blurred additive copy.
- Labels overlapping linework (a crosshair tick running into a coordinate) → put every label on a plate and leave a 10 px gap from tick marks.
- Missing glyphs in the mono font (`′`, `″`) render as fallbacks → use `'` and `"` or check with a crop.
- Hairlines below 1 px or high-frequency hex grids → shimmer and smear in H.264; keep strokes ≥ 1 px and the grid at ≤ 5 % alpha.
- All elements flickering on in the same frame → reads as a strobe; stagger power-on by ≥ 2 frames and keep flicker small-area.
- Everything at full brightness → no hierarchy; use the three alpha levels and keep heat for what is active now.

## Check on stills
- `sheet --every 0.5 --duration 8` — the build order; by 2 s all layers are present; the end hold is still alive (sweep, UTC ticking, cursor).
- `sheet --strip 4.95:5.35 --fps 30` — brackets shrink 1.4 → 1.0, first 3 lock frames white, then orange; the range number rolls then lands.
- `sheet --at 6 --crop 1000,300,500,200` — lock labels sit on a plate, legible, no glyph fallbacks.
- `still --at 7.9` — orange appears only on lock-related elements.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/22-hud (MIT, Vincentwei1021) and lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/hologram-hud (MIT, LemoLab). Written in our own words; no assets copied.
