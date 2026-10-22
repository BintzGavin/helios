# Flat Vector

Friendly geometric shapes in four bright hues that spring into place with squash and stretch, all filmed as one continuous camera move. **Not:** a slide deck of clip-art icons that fade in, nor a "corporate Memphis" scene of long-limbed people.

| Best for | Route | Difficulty | Needs |
|---|---|---|---|
| App explainers, onboarding, feature launches, a playful logo sting | Canvas 2D (or SVG) + closed-form damped springs and one camera transform | Medium | one rounded OFL font (Fredoka, Nunito, Baloo 2) |

Demo: [flat-vector.html](flat-vector.html) — `npx -y @helios-project/cli@latest render flat-vector.html -o flat-vector.mp4 --duration 8 --mode canvas`

## Look
- **Palette:** cream `#FFF3E0` (ground), cream shade `#F3E2C4` (floor), ultramarine `#2E2BFF` / shade `#2020C9` / light `#4B48FF` (structure, end field), coral `#FF5B4F` (the hero, only), sunflower `#FFC22E` / `#EDA514` (FX, rings, wipes), mint `#34E0A8` / `#20BD8B` (supporting shapes), ink `#17163A` (small type, lines).
  - Rules: four hues and a cream. Each hue has exactly **one** darker tone-on-tone shade, used as a flat side strip or half-fill, never a gradient. Coral is reserved for the one hero shape, so the eye always finds it. Type is cream on ultramarine or ink on cream, never coloured.
  - No outlines, no drop shadows, no textures, no gradients. Depth is overlap plus the tone shade.
  - Alternative: teal `#00A6A6` / tangerine `#FF7A1A` / lemon `#FFE14D` / plum `#5B2A86` on off-white `#FAF6EE`.
- **Type:** one rounded geometric face. The demo uses Fredoka 700 for the wordmark at ~0.39 H (420 px) and Fredoka 600 for the tagline at ~0.045 H with +7 px tracking. Lowercase wordmarks suit the style. Letters are separate objects that pop from their baseline, and a letter's dot or counter can be the hero shape. Captions are short, cream, set in the same family.
- **Materials & texture:** cut paper without the paper: perfectly flat fills with big corner radii (pills, half-discs, rings with round caps). Draw every shape in local coordinates so it can scale about its own base.

## Motion
- **Springs, not tweens.** Every entrance is a closed-form damped spring (`f ≈ 2.2–2.6 Hz`, `ζ ≈ 0.4`), so it overshoots once and settles. Squash comes from the spring's *velocity*: stretch along the growth axis while it speeds up, flatten as it brakes. After `pin ≈ 0.9 s` blend the residual to exactly 1, so nothing drifts by sub-pixels under a later zoom.
- Tween-style moves use the overshoot curve `cubic-bezier(0.34, 1.56, 0.64, 1)`. Wipes use ease-out cubic.
- **Stagger 2–4 frames** at 30 fps between siblings (bars 3 frames, letters 3, dots 2).
- **Stretch ∝ speed** along the velocity direction for anything in flight (`k = min(0.34, v / 2400 · 0.3)`, area preserved). Anticipation squash of ~20 % for 4 frames before a hop, landing squash of 30–35 % that rebounds through a stretch.
- **One continuous shot.** The camera is a single transform: a small settle at the start, then a zoom interpolated in **log space** (constant perceived speed) whose peak speed lands on a beat, through the hero into the next scene.
- **Transitions are shape wipes:** a circle or pill grows from the hero, two tones 3 frames apart (sunflower leads, ultramarine follows). Banned: cross-dissolves, blur transitions, hard cuts.
- Smooth 30 fps on ones.

## Signature checklist
- [ ] Every entrance overshoots once (peak scale ≈ 1.1–1.2) and is at exactly 1.0 within ~0.9 s (27 frames).
- [ ] A shape in flight is visibly elongated along its path (≥ 15 % at peak speed) and round at rest.
- [ ] Siblings arrive 2–4 frames apart, never all on the same frame.
- [ ] At most 4 hues plus a cream on screen; each shaded only with its own single darker tone.
- [ ] Coral appears on exactly one object at any time.
- [ ] The zoom is fastest on a beat (demo: 4.0 s) and the shot never cuts; scene changes are shape wipes.
- [ ] The end hold (≥ 1 s) still moves: the hero bobs on two beats and corner shapes rotate slowly.

## Native moves
- **Zoom through the hero.** The camera dives into the coral dot until its colour fills the frame, and the next scene opens as a wipe from inside it. *Fits:* "inside every order there's a person"; drilling from a chart into a single user; entering the product.
- **The hero becomes punctuation.** The shape that performed the whole film drops in as a tittle, a full stop or the counter of a letter in the wordmark. This is the demo's peak (5.36 s), with landing squash and sunflower burst lines. *Fits:* a logo reveal; a product name; a final call to action.
- **Data that bounces.** Bars spring up from a shared baseline on 3-frame stagger and the hero hops from bar to bar. *Fits:* growth numbers; a ranking; step-by-step progress.

## Core technique
```js
function spring(t, f, z) { if (t <= 0) return 0; const w = 2*Math.PI*f, a = z*w, b = w*Math.sqrt(1-z*z);
  return 1 - Math.exp(-a*t) * (Math.cos(b*t) + a/b * Math.sin(b*t)); }
function springV(t, f, z) { if (t <= 0) return 0; const w = 2*Math.PI*f, a = z*w, b = w*Math.sqrt(1-z*z);
  return Math.exp(-a*t) * (w*w/b) * Math.sin(b*t); }
// scale s plus squash k from the spring's velocity; residual pinned to exactly 1 after `pin` seconds
function pop(t, t0, f = 2.4, z = .42, amt = .14, pin = .9) {
  const tt = t - t0; if (tt <= 0) return [0, 0];
  let s = spring(tt, f, z), k = clamp(springV(tt, f, z) / (2*Math.PI*f) * amt * 2, -.3, .3);
  const w = ioQ(inv(pin * .7, pin, tt)); return [lerp(s, 1, w), lerp(k, 0, w)];
}
// draw: ctx.scale(s * (1 - k), s * (1 + k)) about the shape's base
// log-space zoom whose speed peaks mid-window (put the window's middle on the beat)
const p = ioC(inv(ZA, ZB, t));
const s = Math.exp(lerp(Math.log(s0), Math.log(S1), p));
const px = lerp(heroScreenX, 960, p), py = lerp(heroScreenY, 540, p);   // the hero slides to frame centre
ctx.setTransform(s, 0, 0, s, px - heroX * s, py - heroY * s);
```
Because the spring is closed-form, every frame is a pure function of `t` and the squash is free: it is the spring's own velocity, so it is always in phase with the overshoot. Interpolating `log(scale)` makes a 1→21× zoom feel even instead of crawling then snapping. See `dot()` in the demo for stretch along velocity and `lockup()` for the two-tone wipe.

## Pitfalls
- Springs that never quite stop make edges shimmer under a zoom → pin the residual to exactly 1 after ~0.9 s.
- Stretch applied in screen axes looks like a wobble → rotate to the velocity angle first, then scale `(1 + k, 1 / (1 + k))`.
- Too many hues turns it into confetti → four hues, one shade each, coral on one object only.
- Uniform scale-from-centre for everything feels like a template → scale bars from their base, letters from their baseline, decor from its centre.
- Linear zoom (`lerp(s0, s1)`) crawls and then jumps → interpolate the log of the scale.
- A wipe that ends exactly on the frame where the old scene stops drawing leaves a one-frame gap → keep drawing the old scene ~15 frames past the wipe start.
- Determinism: velocity by central difference of a position function of `t` is fine; integrating speed frame by frame is not. Reset transform, alpha and `letterSpacing` every frame.
- Flat colour encodes cleanly, but a full-frame colour change is a flash: keep big wipes to ≤ 2 per second.

## Check on stills
- `sheet --strip 2.8:3.5 --fps 30`: the hero stretches along its arc, squashes on landing, rebounds; speed lines trail against the velocity.
- `sheet --strip 3.4:4.6 --fps 10`: the zoom accelerates into the beat at 4.0 s and decelerates after, with no cut.
- `still --at 1.6`: bars and decor each overshoot at different moments (stagger is visible across one still).
- `still --at 7.5`: four hues max, coral only on the tittle, cream type on ultramarine, corner decor in tone-on-tone ultramarine.

Source: adapted from mg-styles-15 — https://github.com/Vincentwei1021/mg-styles-15/tree/main/demos/01-flat-vector (MIT, Vincentwei1021). Written in our own words; no assets copied.
