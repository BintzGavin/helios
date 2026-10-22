---
name: motion-styles
description: "A library of 24 named visual styles for code-drawn video, each a style card (palette rules, type, materials, motion grammar, a checkable signature list, native moves, the core rendering trick, pitfalls) plus a tested Helios renderAt(t) demo page: synthwave/VHS, ASCII/CRT, pixel art, HUD, dark keynote, risograph, silkscreen, halftone dossier, woodcut, ukiyo-e, Swiss grid, Bauhaus, 60s spy titles, art deco, blueprint, flat vector, shape morph, one-line drawing, cel boil, aurora glass, watercolor/ink, sticker explainer, isometric, variety captions. Also finishing passes (grain, print plates, CRT, film damage) and time tricks (stepped time, springs, in-page motion blur). Use when the user names a look, or a video needs a distinctive, medium-faithful style instead of a generic one."
---

# Motion styles

A style is a set of invariants: what the image is made of, which colours are allowed and what they mean, how things move, how the camera behaves, and what never happens. Get those right and the video reads as that medium; get them wrong and it reads as "flat vector with a noise overlay".

Each style here is a **card** (`references/styles/<slug>.md`) and a **demo** (`references/styles/<slug>.html`), a complete page under the [make-video](../../../plugins/helios/skills/make-video/SKILL.md) contract that passes `helios verify`. Read the card, copy the demo, then replace its content.

## Pick a style

| Style | Feels like | Best for | Route |
|---|---|---|---|
| **Screens and retro** | | | |
| [synthwave-vhs](references/styles/synthwave-vhs.md) | 80s chrome titles over a neon grid, on tape | launches, music, nostalgia | Canvas 2D + optional WebGL VHS |
| [ascii-crt](references/styles/ascii-crt.md) | images made of glyphs on an amber phosphor tube | dev tools, terminals, hacker stories | Canvas 2D glyph atlas |
| [pixel-art](references/styles/pixel-art.md) | 16-bit game scenes on a fixed palette | games, playful brands, loops | low-res buffer, integer scale |
| [hud-fui](references/styles/hud-fui.md) | a sci-fi interface scanning and locking on | data, security, tech reveals | Canvas 2D, additive |
| [dark-keynote](references/styles/dark-keynote.md) | product UI as the hero on a dark stage, one accent | SaaS and app launches | Canvas 2D UI kit |
| **Print** | | | |
| [risograph](references/styles/risograph.md) | two or three translucent inks, misregistered, halftoned | zines, culture, friendly explainers | ink plates + WebGL print |
| [silkscreen](references/styles/silkscreen.md) | opaque stepped inks pulled on camera | posters, events, bold statements | Canvas 2D Path2D plates |
| [halftone-dossier](references/styles/halftone-dossier.md) | a case file of dots, stamps and evidence | investigations, reveals, timelines | SVG / Canvas halftone |
| [woodcut](references/styles/woodcut.md) | light carved out of black | folklore, history, gravitas | carve mask + print |
| [ukiyo-e](references/styles/ukiyo-e.md) | woodblock colour blocks on a handscroll | journeys, landscapes, calm stories | cached block canvases |
| **Graphic and type** | | | |
| [swiss-grid](references/styles/swiss-grid.md) | a strict grid, one signal colour, no decoration | data, corporate, typographic films | Canvas 2D / DOM |
| [bauhaus-poster](references/styles/bauhaus-poster.md) | primaries and geometry, one action per beat | music, design, brand systems | Canvas 2D on a module grid |
| [spy-titles](references/styles/spy-titles.md) | 60s cut-paper title sequence | trailers, intros, credits | Canvas 2D cut-paper |
| [art-deco](references/styles/art-deco.md) | gold keylines unfolding from a centre axis | premieres, luxury, galas | Canvas 2D gradients |
| [blueprint](references/styles/blueprint.md) | white line drafting on a cyanotype sheet | engineering, how-it-works | Canvas 2D draw-on |
| **Motion graphics** | | | |
| [flat-vector](references/styles/flat-vector.md) | bouncy, friendly vector shapes in one continuous shot | apps, explainers, onboarding | SVG / Canvas + springs |
| [shape-morph](references/styles/shape-morph.md) | one shape becoming the next on every beat | logos, loops, brand stories | Canvas 2D polygon morph |
| [one-line](references/styles/one-line.md) | a single unbroken line drawing everything | elegant brands, stories, logos | Canvas 2D arc-length draw-on |
| [cel-boil](references/styles/cel-boil.md) | hand-inked cels with boiling lines and smears | energetic titles, FX, reactions | Canvas 2D brush + exposure sheet |
| [aurora-glass](references/styles/aurora-glass.md) | soft light fields behind frosted glass cards | AI and tech launches, calm UI | WebGL blobs or CSS |
| **Hand, explainer and social** | | | |
| [watercolor-ink](references/styles/watercolor-ink.md) | a journal page painting itself; ink-wash variant | travel, food, reflective stories | Canvas 2D brush engine |
| [sticker-explainer](references/styles/sticker-explainer.md) | die-cut stickers slapped onto a big world, camera flights | explainers, maps, data stories | DOM / Canvas world camera |
| [isometric](references/styles/isometric.md) | a pastel iso city growing tile by tile | platforms, ecosystems, systems | three.js ortho or Canvas iso |
| [variety-captions](references/styles/variety-captions.md) | loud stacked caption stickers popping per character | social clips, reactions, 9:16 | DOM / SVG text stack |

Not sure? Offer the user two or three that fit the topic and say what each would feel like. Characters with acting belong in the [cartoon-short](../../guided/cartoon-short/SKILL.md) skill; this library is about the look.

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

1. **Pick the style** and read its card start to finish.
2. **Mini-treatment.** Sketch three possible structures and pick one. Place one native move at the peak. Write down what you'll learn from the demo and what you won't take from it.
3. **Style frames before motion.** Build two or three key frames with the real drawing code and render them with `helios still`. Check them against the signature checklist. Fix the look before animating anything.
4. **Build** from the demo: keep its technique, replace its content, palette (within the card's rules) and structure.
5. **Review.** Stills at 6–10 key times, a sheet every 0.5 s, a strip over the fastest move, crops of fine texture and text, then `verify` and `check`. Tick the signature checklist.
6. **Not the demo again.** Compare your video with the card's demo on six things: structure, opening, signature shot, camera path, rhythm, ending. At least four must differ.

## Rules for every style

- **The card's invariants override generic motion rules.** Swiss bans bounce and fades; silkscreen and ukiyo-e ban dissolves; Bauhaus and pixel art want empty space, not four layers of depth; collage-like and cel styles cut hard by design. Where a card conflicts with [motion-design-rules](../../guided/motion-design-rules/SKILL.md) or other generic advice, the card wins.
- **One accent, one job.** Almost every style reserves one colour for one element or one moment. Don't spend it everywhere.
- **Stepped things on twos, camera on ones.** Characters and hand-made elements step at 12 fps (`Math.floor(t * 12 + 1e-4) / 12`); the camera moves smoothly, because a stepped camera judders. Render stepped styles at `--fps 24` so each drawing holds exactly two frames.
- **Texture is seeded, and mostly fixed per shot.** Registration offsets and paper come from `hash(shotIndex)`; boil and grain step at 12 fps from `Math.floor(t * 12)`; accents get analytic "kicks". Nothing comes from `Math.random()`.
- **Texture must survive encoding.** Halftone dots at a period of at least 7 px, hairlines at least 1.5 px, grain subtle. Check with `sheet --crop` and render the final with `--preset medium`.
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
