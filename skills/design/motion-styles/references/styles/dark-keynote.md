# Dark Keynote

A software launch film where the interface is the hero: original UI drawn in code on a near-black stage with a faint grid, cool grey surfaces, one luminous accent for the product, and motion that snaps to a grid on the beat. **Not:** a screen recording, a glossy 3D device render, or a "tech" template with gradients everywhere — there is no real OS chrome, only one accent, and the drama comes from disorder turning into order.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| SaaS / app launches, feature announcements, "before → after" product stories, stat reveals | Canvas 2D: UI kit as functions (surface, card, toast, cursor) + generated layouts + back-out easing on a beat grid | Medium | Inter, Inter Tight, JetBrains Mono (Google Fonts) |

Demo: [dark-keynote.html](dark-keynote.html) — `npx -y @helios-project/cli@latest render dark-keynote.html -o dark-keynote.mp4 --duration 8 --mode canvas --preset medium`

## Look
- **Palette:** stage `#08090b` with a radial lift `rgba(40,46,60,.55)` at the upper centre, one off-centre cool glow `rgba(70,90,160,.07)`, 55 % corner vignette; grid of 1 px lines on a 48 px module (white 3 %, every 4th line 6 %). Surfaces `#121418` / `#181b20` / `#1f2329` with a 1 px `rgba(255,255,255,.08)` border and a 1 px top highlight. Text greys `#eceef2` (primary), `#9aa0aa` (secondary), `#5d636d` (labels). Accent lime `#b7f34a`. Problem colour `#ff4d4f`.
- **Colour rules:** neutrals are slightly blue, never warm. **One accent**, reserved for what the product *is* or *does* — the action button, the key number, the brand dot, the caption's speaking dot. If two things compete in the accent, one is wrong (the demo hands the accent from the number to the brand dot when the lockup arrives). The **problem colour** lives only on the problem (badges, the unread counter) and dies at the turn — it never returns. Alternative accents: violet `#8b7cff`, signal orange `#ff7a1a`.
- **Type:** Inter 600 for UI titles (15–16 px) and the wordmark (64 px, −1.5 px tracking); Inter 400 for secondary lines; **Inter Tight 600 for the giant number** (300 px ≈ 0.28 H, tracking ≈ −4.5 %); JetBrains Mono 500 for labels and IDs, uppercase with wide tracking (3–6 px). One line per screen; nothing is captioned over the number.
- **Captions** are a UI component — a **toast pill** bottom-centre: `rgba(22,24,29,.88)` fill, 1 px light border, soft shadow, Inter 500 40 px, an accent dot that pulses while "speaking"; enters with a 12 px rise + fade over 0.16 s.
- **Materials & texture:** no grain, no noise. Depth comes from soft shadows (blur 24, y 10), the 1 px highlight, and a slight Dutch tilt during disorder only. All UI is invented: rounded cards with a monochrome line glyph, a title and a subtitle; no real app icons, window buttons, menu bars or docks.

## Motion
- **On ones, no stepping.** Precision, not craft.
- **Easing:** `back` with s ≈ 1.3 (fast-out, one small overshoot, immediate settle) for spawns, flights and lockups; cubic ease-in only for things leaving (badges popping, the grid squashing).
- **Beat grid (120 BPM, 0.5 s):** spawns accelerate toward the turn (`t_i = 2.25·√(i/N)`), each a 0.28 s drop + settle; the press lands one beat before the turn; the snap starts **on** the turn and the grid lands within ~0.5 s (row stagger 20 ms); digits lock on sixteenth notes (0.125 s).
- **Flights** curve (a sine bulge of ~60 px) and same-type elements bend the same way; rotation unwinds to 0 as they land.
- **The living element:** the cursor glides, winds up (~0.3 s), presses with a 2-frame contact (cursor 0.86×, button squashed 1.05 × 0.9) and a ring ripple.
- **Disappearing is designed:** badges pop to 0 in 0.12 s; the grid squashes into a single accent line that collapses to a point. Nothing just fades except captions.
- **Camera:** the stage never moves on its own; a 1.03 → 1.0 settle and a ≈ 0.7° Dutch tilt with a tiny tremble belong to the chaos and straighten with a back-out at the turn.

## Signature checklist
1. Stage: near-black with a visible top-centre lift and a 48 px hairline grid (every 4th line brighter); no grain.
2. Exactly one accent hue on screen at any time; the accent sits on the focal element.
3. Problem colour present before the turn, **absent in every frame after it** (badges gone within 0.12 s).
4. Snap landing: elements overshoot their slot by a few px (back s ≈ 1.3) and settle within ~0.15 s; all land within one beat.
5. Giant number: ≥ 0.25 H, digits lock left → right one per 0.125 s out of hashed digit noise, each with a ≈ 26 px bounce; no caption while it is alone.
6. Captions are toast pills (40 px Inter 500, accent dot), never bare text.
7. UI surfaces: 1 px border at ~8 % white, 1 px top highlight, soft shadow; radius 10–14 px.

## Native moves
- **Generated accumulation.** Cards are spawned by rule, faster and faster, with problem-red badges and a climbing "unread" counter, until the screen tilts. *Fits:* backlog, alert fatigue, cost creep, tickets piling up.
- **The snap grid (the turn).** One click; every element flies to its typed slot in one beat, the problem colour disappears, the frame straightens. *Fits:* the product's core promise — sorting, syncing, scheduling, cleaning up. Put it at the emotional peak.
- **Number out of glyph noise.** The grid collapses into a line, then a huge number scrambles and locks digit by digit in the accent; the accent then hands over to the brand mark. *Fits:* items processed, time saved, latency cut, a price.

## Core technique
```js
const back = (k, s = 1.3) => (k = clamp(k), 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2));
// each card: spawn (drop + settle), then the snap flight to its typed slot on the turn
const e = back(prog(t, c.t0, .28));
const k = c.row * .02 + c.col * .008, fly = back(prog(t, TURN + k, .45));
const bulge = Math.sin(Math.PI * clamp((t - TURN - k) / .45)) * 60;          // curved path, same bend per side
const x = lerp(c.x, slotX(c), fly) - bulge * (c.col < 2 ? 1 : -1), y = lerp(c.y - 30 * (1 - e), slotY(c), fly);
const w = lerp(300, 350, fly), h = lerp(76, 40, fly), rot = c.rot * (1 - fly);   // card morphs into a list row
const badge = t < TURN ? 1 : 1 - inC((t - TURN) / .12);                       // the problem colour dies at the turn
// digits: hashed noise until each locks on a sixteenth
const cells = [...'1,284'].map((ch, i) => { const tl = t0 + i * .125;
  return !/\d/.test(ch) || t >= tl ? { ch, lock: t - tl } : { ch: String(Math.floor(hash(frameOf(t), i * 7 + 1) * 10)), lock: -1 }; });
```
Every element is a function of its own spawn time and the shared turn time, so the whole choreography is a handful of `prog()` windows on a beat grid. Layout is generated (seeded positions, slot = column by type, row by index), never hand-placed. See `card()`, `toast()` and the hero block in `renderAt` in the demo.

## Pitfalls
- Two accent-coloured things competing (number + button + brand dot) → hand the accent over explicitly; secondary things go to primary grey.
- Problem red sneaking back after the turn (a warning toast, an error state) → it breaks the story; grep for the problem colour after `TURN`.
- Fading everything in and out → reads as a slideshow; spawn with drop/pop/fly and remove with pop/squash.
- Hand-placed clutter → looks staged; generate positions from a seeded hash, then keep cards clear of the caption zone (bottom 15 %).
- `letterSpacing` plus a manual per-glyph advance → the tightening is applied twice; measure each glyph with spacing at 0 and subtract your own tracking once.
- Thin 1 px grid lines at very low alpha are fine in H.264, but animated 1 px borders on hundreds of moving cards shimmer → keep borders at ≥ 8 % and let motion carry the read.
- Captions over the hero number → let the number stand alone for ≥ 1 s; the next caption arrives with the lockup.

## Check on stills
- `still --at 2.9` — chaos: tilted frame, red badges, red unread counter, accent only on the button.
- `still --at 3.3` and `--at 4.0` — cards mid-flight on curved paths, then a clean 4-column grid with mono column labels and no red anywhere.
- `sheet --strip 4.6:5.4 --fps 15` — digits lock left → right out of noise, each with a small bounce.
- `still --at 7.6` — composed end: white number, wordmark with the accent dot, toast caption; the dot is breathing.

Source: adapted from lemo-opuscar — https://github.com/lemomo-ai/lemo-opuscar/tree/main/styles/dark-keynote (MIT, LemoLab). Written in our own words; no assets copied.
