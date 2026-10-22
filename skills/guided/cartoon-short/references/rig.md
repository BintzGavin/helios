# The character rig

One function draws the character at any size, pose, view and emotion:

```js
character(x, groundY, u, opts)
```

- `(x, groundY)` is the ground point between the feet. Rotation and squash pivot there, so feet stay planted.
- `u` is the size unit. Every coordinate inside the function is a multiple of `u`. Line weight scales with it too: `sw = clamp(u / 7, 1.5, 7)`, and lower it under a camera zoom, because outline weight is in world units.
- `opts` is one flat object. Build it by spreading layers: `{ ...emotions(t, keys), ...turn(t, 3, 3.2, 0, .25), hat: 'party' }`. Fields that several layers touch, mainly `dy` and `sq`, must be **added**, not overwritten.

## Options

| Group | Fields |
|---|---|
| Pose | `dx, dy` (in `u`), `sq` (squash: + squashes, − stretches), `rot` (radians, pivots at the feet), `flip`, `aL, aR` (arm angles: 0 = out, + = up), `walk` (leg phase), `noShadow` |
| View | `view` (`front`, `q`, `side`, `qback`, `back`), `smear`, `smearDir` |
| Face | `eyes` (a drawer name, or `[left, right]`), `mouth`, `brows` (if the character has them), `lookX, lookY` (−1..1), `squint` (0..1), `blush` |
| Colour | `tint`, or explicit `col / lt / dk` |
| Extras | `emote`, `emoteK` (0..1 pop), `emoteAge`, props |
| Hooks | `draw(u, sw)` paints in body space; `armL(u, sw)` / `armR(u, sw)` paint at the arm tip in arm space, so a held prop follows the hand |
| Boil | `boilKey`: the seed prefix. Set it per character so two characters never share a stream |

**Squash keeps volume:** `scale(1 + sq * .6, 1 - sq)`. Clamp `sq` to about ±.35 or the character turns into a pancake.

**The shadow** is a soft ellipse at the ground point that shrinks and fades as `dy` rises. It sells every jump.

**Draw order:** shadow, back arm, legs, body, face, hat, front arm, `draw` hook, emote. In a ¾ or side view, far limbs are drawn first and darker.

## Designing the character

1. **Silhouette first.** Fill the outline solid ink. If you can't tell what it is or which way it faces, simplify. One main body shape plus a few parts.
2. **A unit grid.** Sketch it on a 10u × 10u grid. Write down the pivot of every part: arms at the body edge around mid-height, eyes on a line about two-thirds up.
3. **Proportions that act.** A big head or face area relative to the body lets expressions read at medium shot. Short limbs are easier to keep on model.
4. **Colours.** Base, light, dark for the body; one accent (scarf, hat, cheeks) that can carry a colour arc. Check the character against every background in the storyboard.
5. **Original only.** Don't trace or "simplify" an existing mascot, game character or brand character.

## Faces: a library of drawers

The face is a set of small drawer functions keyed by name. Each draws one eye (called once per side with `s = ±1`) or one mouth, in body space.

- **Eyes:** `normal, look, wide, half, happy` (upward arc), `closed` (downward arc), `sad, angry, determined` (eye shape tilted like a brow), `squeeze` (>_<), `spark, heart, x, swirl, dot`. Pair mismatched eyes for confusion: `eyes: ['half', 'wide']`.
- **Mouths:** `smile, grin, flat, frown, O, o, wobble, smirk, laugh, teeth, tongue, wail`, or none.
- **Brows** are optional. A character without brows carries them in the eye shape: angry = top edge slanting down toward the middle, sad = slanting up toward the middle.
- **Squint** scales any open eye's height toward a line; above 0.8, draw the closed line instead. `emotions()` uses it to hide face swaps.
- **Look** shifts pupils and, a little, the whole face. The eyes move first, then the body follows (show the thought).
- **Blink** in closed form, offset per character with a `seed` so two characters never blink together:

```js
const blink = ((t * .9 + seed * 1.7) % 3.3) < .12;   // ~120 ms blink every ~3.7 s
```

## Turnarounds: a views table, never 3D

A turn goes through drawn key views, like a model sheet. Store each view as data:

```js
const VIEWS = {
  front: { L: -5, R: 5,   face: { cx: 0,   fw: 1,   sides: [-1, 1] }, legs: [[-2, 0], [2, 0]],  arms: [[-4.9, -1, 'L', 'back'], [4.9, 1, 'R', 'front']] },
  q:     { L: -5, R: 5.1, face: { cx: 1.5, fw: .74, sides: [-1, 1] }, strip: [-5, -2.3],          // darker side strip with a seam line
           legs: [[-2, 1], [2.2, 0]], arms: [[5, 1, 'R', 'front'], [-4.7, -1, 'L', 'back']] },
  side:  { L: -3.1, R: 3.1, face: { cx: 1.35, fw: .55, sides: [1] }, legs: [[-1, 1], [1, 0]],    arms: [[0, 1, 'R', 'front']] },
  qback: { L: -5, R: 5, face: null, ... },
  back:  { L: -5, R: 5, face: null, back: true, ... },
};
```

- `L, R` are the silhouette edges in `u`. `face.cx` shifts the face toward the facing side; `face.fw` compresses it; `sides` says which eyes show.
- Legs are `[x, isFar]`; far legs are drawn first and darker. Arms are `[pivotX, dir, which, layer]`.
- All views face right; `flip` mirrors them for left.

A turn eases a heading (in turns, 0 = front, .25 = side, .5 = back) and snaps it to the nearest drawing, with a smear on the in-betweens:

```js
const VIEW_RING = ['front', 'q', 'side', 'qback', 'back', 'qback', 'side', 'q'];  // 8 drawings around
const spinView = (a) => { const i = Math.round((((a % 1) + 1) % 1) * 8) % 8; return { view: VIEW_RING[i], flip: i > 4 }; };
function turn(t, t0, t1, a0, a1) {                  // a quick turn: 0.12–0.25 s
  const k = ease(seg(t, t0, t1));
  return { ...spinView(lerp(a0, a1, k)), smear: .55 * Math.sin(k * Math.PI) };
}
```

## Model sheet

Before animating, render the character in every emotion and every view on one page and look at it:

```js
// sheet.html: a grid of characters, one per emotion, at a fixed t
const names = Object.keys(EMO);
window.renderAt = async (t) => {
  await ready; BN = 0;
  names.forEach((n, i) => character(160 + (i % 8) * 220, 260 + Math.floor(i / 8) * 260, 14, { ...feel(n, 1.0), boilKey: 'm' + i }));
};
```

```bash
npx -y @helios-project/cli@latest still sheet.html --at 0
```

Check that each emotion reads with no label, that the views line up (same height, same ground), and that the colours hold on every background. Keep every character on model within one video: same `u` ratios, same colours, same line weight at the same shot size.

## Lip sync

Mouths are emotion poses. A mouth that flaps to every syllable reads as jitter. For dialogue, open and close the mouth from the voice's loudness (`helios analyze voice.mp3` gives `envelope.level` per frame), quantized to two or three mouth shapes and held on twos.
