---
name: motion-styles
description: "Opt-in library of established visual styles for code-drawn Helios videos: style cards (colour rules, type, motion grammar, a checkable signature list, the core rendering trick) with tested renderAt(t) demo pages, plus finishing passes and time tricks. Load it only when the user names a specific established style or medium they want reproduced (a print process, a retro screen look, a design movement), or asks to see Helios's style options. Do not load it to choose a look for a video request that names no style: design an original look instead, and at most offer this library."
---

# Motion styles

A style is a set of invariants: what the image is made of, which colours are allowed and what they mean, how things move, how the camera behaves, and what never happens. Get those right and the video reads as that medium; get them wrong and it reads as "flat vector with a noise overlay".

Each style is a **card** (`references/styles/<slug>.md`) and a **demo** (`references/styles/<slug>.html`), a complete page under the [make-video](../../../plugins/helios/skills/make-video/SKILL.md) contract that passes `helios verify`.

## When to use this library

This library is a set of known answers, and known answers pull everything toward themselves. An agent that reads a menu of 24 looks before every video makes those 24 looks forever. So the library is **opt-in**:

| The request | What to do |
|---|---|
| Names a style or medium ("make it risograph", "like an old blueprint", "Swiss style") | Open that one card: `references/styles/<slug>.md`. If you're unsure of the slug, list `references/styles/`. Don't read the catalog. |
| Asks for style options, or says "surprise me with a known look" | Read [references/catalog.md](references/catalog.md) and offer at most three styles chosen with a seed, plus one original direction. Build only what they pick. |
| Names no style | Don't use this library. Design an original look from the brief and a random seed (the make-video skill describes how). You may offer once, in one line, that a known style from this library is available. Load it only if they say yes. |
| Gives a brand or design system | Follow the brand. A card can lend a technique (a halftone, a grain, a draw-on) only if the user asks for that treatment. |

Never copy a demo's composition. Demos show how a technique is built; the video should come from the user's subject.

## Vary within the style

Two risograph videos should not be the same video in different words. Before the treatment, draw a random seed and let it make the choices the card leaves open.

If an **apply-randomness** skill is available, use it for this step. Otherwise:

```bash
LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 256; echo
```

Look for a few verifiable patterns in the string (a digit run, a repeated fragment, a cluster of capitals, an odd/even split) and turn each into a concrete choice inside the card's "safe to change" axes: the subject's framing, the palette variant within the colour rules, the structure, which native move goes at the peak, the opening and the ending. Keep the seed and a one-line pattern → choice map in your notes. The card's invariants never change; the seed only moves what the card leaves free.

## What a card holds

| Section | What it fixes |
|---|---|
| Essence and **Not** | The medium in one line, and the cheap version to avoid |
| Look | Palette *rules* (how many hues, what the one accent is reserved for, what is never coloured), type, materials |
| Motion | Easing, timing, stepping, allowed and banned transitions, camera grammar |
| Signature checklist | 5–7 features with numbers, checkable on stills ("overshoot 1.15 → 1.0 within 8 frames", not "bouncy") |
| Native moves | Moments only this medium can do. Put one at the emotional peak. |
| Core technique | The rendering trick that makes it look right |
| Pitfalls | What goes wrong, including encode and determinism problems |
| Check on stills | What to look for in `still`, `sheet --strip` and `sheet --crop` |

## Workflow

1. **Read the card** the user asked for, start to finish.
2. **Seed and mini-treatment.** Draw the seed (above). Sketch three possible structures from it and pick one. Place one native move at the peak. Write down what you'll learn from the demo and what you won't take from it.
3. **Style frames before motion.** Build two or three key frames with the real drawing code and render them with `helios still`. Check them against the signature checklist. Fix the look before animating anything.
4. **Build** with the demo's technique, not its composition: your subject, your structure, a palette chosen within the card's rules.
5. **Review.** Stills at 6–10 key times, a sheet every 0.5 s, a strip over the fastest move, crops of fine texture and text, then `verify` and `check`. Tick the signature checklist.
6. **Not the demo again.** Compare your video with the card's demo on six things: structure, opening, signature shot, camera path, rhythm, ending. At least four must differ.

## Rules for every style

- **The card's invariants override generic motion rules.** Swiss bans bounce and fades; silkscreen and ukiyo-e ban dissolves; Bauhaus and pixel art want empty space, not four layers of depth; collage-like and cel styles cut hard by design. Where a card conflicts with [motion-design-rules](../../guided/motion-design-rules/SKILL.md) or other generic advice, the card wins.
- **One accent, one job.** Almost every style reserves one colour for one element or one moment. Don't spend it everywhere.
- **Stepped things on twos, camera on ones.** Characters and hand-made elements step at 12 fps (`Math.floor(t * 12 + 1e-4) / 12`); the camera moves smoothly, because a stepped camera judders. Render stepped styles at `--fps 24` so each drawing holds exactly two frames.
- **Texture is seeded, and mostly fixed per shot.** Registration offsets and paper come from `hash(shotIndex)`; boil and grain step at 12 fps from `Math.floor(t * 12)`; accents get analytic "kicks". Nothing comes from `Math.random()`.
- **Texture must survive encoding.** Halftone dots at a period of at least 7 px, hairlines at least 1.5 px, grain subtle. Check with `sheet --crop` and render the final with `--preset medium`.
- **Pass the flash check.** `helios check` (WCAG 2.3.1) counts luminance flips per block of pixels. A zoom or pull-out across dense high-contrast texture (a wall of tiles, sand, magnified halftone) fails however slowly it moves, and so does a big shape that slides out and back on every beat. Fixes are in [finishing.md](references/finishing.md).
- **One world-to-screen function.** Anything that tracks a subject (labels, effects, reticles) goes through the same camera function as the subject, or it drifts after the first camera move.
- **Subject big at key moments:** at least a third of the frame height.
- **Text in the style's world.** Captions are a cartouche, a stamped band, a NOTE box, a LOG strip or a toast, not a default subtitle bar. Hold each for at least `max(1.8 s, letters / 15 + 1.5 s)`.
- **Original content only.** Describe a medium's grammar; never imitate a specific artist, studio, film, brand or event identity.

## Shared references

- [references/finishing.md](references/finishing.md): grain, dither, vignette, glow, paper, ink plates and a WebGL press shader, halftone, CRT/VHS, film damage, die-cut outlines, chrome text.
- [references/time-tricks.md](references/time-tricks.md): exposure sheets, stepped and remapped time (`sceneTime`), springs and impulses, keyframe tracks, log and smooth zooms, precomputed integrals, curvature-weighted pen timing, and in-page motion blur that keeps text and counters sharp.

## Make your own style

To adapt a card into the user's own style, sort its sections into three groups:

- **Safe to change:** the palette (within the card's colour rules), type, tempo, sound, which native moves you use.
- **Changes its character:** materials and rendering, the colour logic itself, camera grammar. Change these knowingly.
- **Can't change:** the essence and the core technique. Change those and it's a different style.

Write a new card in the same format next to the original, list what changed and why, render a style frame beside the original's, and make a 15–30 s test that shows every change.

## Credits

Styles are adapted from two MIT-licensed libraries: [lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) by LemoLab (the style-card format and most print, graphic and retro styles) and [mg-styles-15](https://github.com/Vincentwei1021/mg-styles-15) by Vincentwei1021 (motion-graphics styles, sub-frame-safe timing and the signature-checklist prompt structure). Cards and demos are written in our own words and code, and no assets are copied. Each card names its source. See [THIRD_PARTY.md](../../THIRD_PARTY.md).
