# Variety Captions

Loud, candy-coloured caption stickers that pop onto a social clip one character at a time, a beat after the moment they react to: thick white and coloured outlines, a chunky extrusion, a glossy gradient fill and a little wiggle while they hold. **Not:** plain subtitles with a drop shadow, or a whole word that just scales up as one block.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| vlogs, pet and food clips, reaction and interview cut-downs, short social promos (as a caption component over footage or a drawn scene) | SVG/DOM text stack (extrusion → outer stroke → white stroke → gradient fill → gloss) + per-character springs | Easy–Medium | a rounded heavy OFL font (Baloo 2 / Fredoka for Latin, ZCOOL KuaiLe for CJK) |

Demo: [variety-captions.html](variety-captions.html) — `npx -y @helios-project/cli@latest render variety-captions.html -o variety-captions.mp4 --duration 9 --width 1080 --height 1920`. **Vertical 9:16, 1080×1920.** A drawn "Halcyon Kitchen" pancake clip on a tilted photo card:
- "Pancake day!" pops in as the hook.
- "FLIP!" lands just after the pancake does, with a punch-in.
- A small "(so fluffy)" aside follows.
- At 60 % the hero "PERFECT!!" slams in on a starburst with speed lines and sparkles, and a CJK "好吃！" joins it for the end hold.

## Look
- **Palette:** hot pink `#FF3D7F`, sunny yellow `#FFD23F`, cyan `#38D3EC` (with a lighter stripe `#5EE0F3`) and navy `#1E2A78` (deep extrusions `#0E1440`, pink extrusion `#A3124F`), plus white.
  - Rules: every caption gets **one coloured outer stroke** (pink or navy), always a **white stroke** inside it, and a fill gradient that runs light to saturated top-down.
  - Navy is the only dark: outlines, extrusions and doodle strokes.
  - Pick the fill so it contrasts with the stroke (pink outline → yellow fill, navy outline → pink, cyan or white fill).
  - Never use thin type, black or desaturated colour. Saturation is the point.
- **Type:** rounded, heavy, friendly. Baloo 2 800 (or Fredoka 700) for Latin, ZCOOL KuaiLe for CJK (load it with Google Fonts' `&text=` subset).
  - Sizes: reactions ~8–10 % of frame height, the hero ~9 %, asides ~4 % (navy fill, white stroke only, no extrusion, slight tilt). Small extra tracking (4–8 px) stops the thick outlines fusing, and a space is ~0.3 em.
  - Captions sit at angles between −8° and +8°, near the thing they react to, never in a fixed subtitle band. Keep them inside ~5 % safe margins.
- **Materials & texture:** stacked vector text. From the back:
  1. Two extrusion copies offset down by `ext` and `ext/2`.
  2. The outer stroke in the accent colour at width `2·(white + outer)`.
  3. The white stroke at `2·white`.
  4. The gradient fill.
  5. A gloss copy filled white → transparent over the top 46 %.
  
  Then one soft navy drop shadow (`feDropShadow`, dy 10, blur 9, 35 %). Pair it with doodle props in the same outline weight: starburst frames, speed lines, 4-point sparkles, sweat drops, confetti dots.

## Motion
- **Per-character pop:** scale 0 → **1.15 → 1.0 in ~8 frames** (damped spring, ζ 0.517, ω 22 rad/s, which peaks around frame 5). Each character also drops in from −0.35 em and rotates in from ±14° on slightly softer springs. **Stagger: 2 frames per character.**
- **Timing to sound:** the first character starts **2–3 frames after** the audio or visual moment (`at + 2.5/30`). Landing exactly on the beat reads as early, and landing late reads as a reaction.
- **Hold:** once settled (~0.25 s after landing), each character wiggles by ±2.2° and bobs ±4 px at ~1.1 Hz, with a per-character phase and a ±1.2 % scale breath. It never fully stops.
- **Exit:** pop-out over ~5 frames, scale 1 → 1.12 → 0. No fades.
- **Punch-ins:** on a big moment the footage layer snap-zooms +7–12 % within 2 frames, then relaxes (`e^{−3.2·dt}`). A decaying shake `A·e^{−7·dt}·sin(2π·11·dt)` (A 14–26 px) runs on top. Captions take only ~35 % of the shake, so they stay readable.
- 30 fps on ones. Cuts are fine in the footage underneath, and captions survive across them.

## Signature checklist
1. Each caption has the full **5-layer stack**: 2 extrusion copies, a coloured outer stroke, a white stroke, a gradient fill and a gloss. Asides may drop to a white stroke only.
2. Characters pop **0 → 1.15 → 1.0 within ~8 frames**, **2 frames apart**.
3. The first character appears **2–3 frames after** its cue moment.
4. Holding captions **wiggle**, with rotation ±2–3° and bob ±3–5 px, and are never perfectly still.
5. **Punch-in** on at least one hit: +7–12 % zoom with a decaying shake, and the caption shakes less than the footage.
6. Palette is **pink / yellow / cyan / navy** plus white, with no other hues on the captions.
7. At least one **doodle prop** (starburst, speed lines, sparkles) supports the hero caption.

## Native moves
- **Character cascade on the beat.** A word assembles letter by letter just behind the sound, so the caption feels like it *heard* the moment. *Fits:* a punchline; a product name being said; a pet doing the thing.
- **Starburst slam (hero).** The biggest caption lands inside a navy-outlined starburst that springs open, with speed lines flashing outward and sparkles twinkling on, plus the strongest punch-in and shake of the clip, at ~60 % of the runtime. *Fits:* the payoff; "PERFECT!!"; a reveal or a score.
- **The whispered aside.** A small, tilted, stroke-only caption such as "(so fluffy)" or "(quietly)" adds commentary without competing with the main line. *Fits:* inner voice; a joke under the joke; a disclaimer with personality.

## Core technique
```js
// one character = a <g> of stacked <text> copies (back to front), driven by a spring
function charStack(parent, ch, s) {               // s: {font,size,white,outer,ext,outerColor,extColor,fill,gloss}
  const g = el('g', {}, parent), W = 2 * (s.white + s.outer);
  const T = a => { const e = el('text', { 'font-family': s.font, 'font-size': s.size, 'font-weight': 800,
    'text-anchor': 'middle', 'dominant-baseline': 'central', 'stroke-linejoin': 'round', ...a }, g); e.textContent = ch; };
  T({ y: s.ext, fill: s.extColor, stroke: s.extColor, 'stroke-width': W });      // extrusion, far
  T({ y: s.ext / 2, fill: s.extColor, stroke: s.extColor, 'stroke-width': W });  // extrusion, near
  T({ fill: s.outerColor, stroke: s.outerColor, 'stroke-width': W });            // coloured outer stroke
  T({ fill: '#fff', stroke: '#fff', 'stroke-width': 2 * s.white });              // white stroke
  T({ fill: s.fill }); T({ fill: s.gloss });                                     // gradient fill + top gloss
  return g;
}
// ζ .517, ω 22: 0 → 1.15 (≈ frame 5) → 1.0 (≈ frame 8)
const spring = (u, z = .517, w = 22) => u <= 0 ? 0 : 1 - Math.exp(-z * w * u) *
  (Math.cos(w * Math.sqrt(1 - z * z) * u) + z / Math.sqrt(1 - z * z) * Math.sin(w * Math.sqrt(1 - z * z) * u));
const t0 = cue + 2.5 / 30 + k * 2 / 30;           // k = glyph index: land late by 2–3 frames, 2-frame stagger
const u = t - t0, hold = clamp((u - .25) / .4);
g.setAttribute('transform', `translate(${x} ${y + hold * 4 * Math.sin(2.2 * Math.PI * t + k)})
  rotate(${rot + hold * 2.2 * Math.sin(2.2 * Math.PI * t + k * 1.7)}) scale(${Math.max(.001, spring(u))})`);
```
Characters are laid out once in `ready`, using canvas `measureText` with the same loaded font. Everything else is a closed-form function of `t − t0`, so frames render in any order. Keep the stroke order exactly as above: SVG strokes are centred on the outline, so each wider copy behind a narrower one shows as a ring. See `caption()` and `drive()` in the demo.

**Pairing and checking:** the captions are real SVG `<text>`, so `helios verify --cues captions.srt` (in CLI versions that support `--cues`) finds them on screen automatically. If you draw the same component on a canvas instead, declare each visible string with `window.heliosDrawnText?.add(text)`. Use this as the caption layer of a social clip: footage or a drawn scene underneath, captions and props in a separate top layer.

## Pitfalls
- Wrong stroke order, or one `<text>` with `paint-order` alone → no white ring between the colour and the fill. Stack separate copies, back to front.
- Thick outlines make neighbouring letters fuse and spaces vanish. Add 4–8 px tracking and give spaces ~0.3 em of advance.
- Measuring glyph advances before the font loads → letters overlap or gap. Await `document.fonts.load(...)` for each family, then `document.fonts.ready`, then lay out.
- Naming a global `top`, `name` or `status` in a classic script collides with `window` properties and kills the page ("Identifier 'top' has already been declared"). Use distinct names.
- Captions landing exactly on the beat look early, and more than ~4 frames late looks laggy. Offset by 2–3 frames.
- Shaking captions as hard as the footage makes them unreadable → scale caption shake to ~⅓.
- Big white outlines smear in H.264 over busy stripes → use stripes ≥ 40 px wide and render the final with `--preset medium`. Keep sparkles and confetti from strobing (twinkle by scale, never on/off every frame).

## Check on stills
- `sheet --strip <cue>:<cue+0.4> --fps 30 --crop ...` on one caption: the first glyph appears 2–3 frames after the cue, with a 2-frame stagger, and each glyph overshoots to ~1.15 before settling.
- `still` on a held caption: all 5 layers are visible (extrusion, colour ring, white ring, gradient, gloss) and the glyphs don't fuse.
- Hero frame: starburst, speed lines and sparkles are present, and the punch-in has visibly enlarged the footage card.
- All captions sit inside 5 % margins at 1080×1920, and nothing but navy is used as a dark.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/18-hanazi (MIT, Vincentwei1021). Written in our own words; no assets copied.
