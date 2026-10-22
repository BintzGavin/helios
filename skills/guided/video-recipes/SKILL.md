---
name: guided-video-recipes
description: "Opt-in recipes for specific code-video genres, each with structure, technique, gotchas and a tested Helios renderAt(t) demo: scale dives (powers of ten), step-by-step process explainers, era timelines, mechanism and proof explainers, kinetic typography, one-shape UI morph loops and pixel-art sprite scenes, plus a video brief template and a gotcha list. Load it only when the user asks for one of these genres by description or name, or asks for genre options or a brief template. Don't load it for general video requests."
---

# Video recipes

The genres below come from studying hundreds of shared code-made videos and the prompts behind them. The viral ones sit on short prompts and a strong renderer; the reproducible ones come from structured briefs. Each recipe gives you the structure, the look, the hard technical part, its gotchas, the stills to check, an example brief, and a demo page that passes `helios verify`.

All of them are one `window.renderAt(t)` page under the [make-video](../../../plugins/helios/skills/make-video/SKILL.md) contract.

## Pick a recipe

| Genre | The viewer experiences | Length | Recipe |
|---|---|---|---|
| Scale dive | One continuous zoom through 5–7 nested levels, from a room to an atom or a street to a galaxy | 20–45 s | [scale-dive](references/genres/scale-dive.md) |
| Process / recipe | An empty glass, plate or box becomes the finished thing, step by step, with live measurements | 20–60 s | [process-recipe](references/genres/process-recipe.md) |
| Era timeline | Centuries pass in a drawn medium; a year counter rolls; one motif changes per era | 30–90 s | [era-timeline](references/genres/era-timeline.md) |
| Mechanism / proof | A machine or diagram whose every motion is one logical step, ending in the general statement | 30–90 s | [mechanism-proof](references/genres/mechanism-proof.md) |
| Kinetic type | A short text where words become objects, paced to the phrase, with real stillness | 15–25 s, loop | [kinetic-type](references/genres/kinetic-type.md) |
| UI morph loop | One shape never cuts: it becomes a button, a loader, a player, a slider, a chart, and back | 14–20 s, loop | [ui-morph-loop](references/genres/ui-morph-loop.md) |
| Pixel sprite | A pixel-art character loop or scene, on a fixed palette at integer scale | 4–20 s, loop | [pixel-sprite](references/genres/pixel-sprite.md) |

Other genres already have Helios skills:

- Lyric and karaoke music videos: [music-video](../music-video/SKILL.md).
- Character cartoons: [cartoon-short](../cartoon-short/SKILL.md).
- Promo, explainer, product demo, testimonial, launch and social clip: the other [guided skills](../).
- Animated charts: [visualize-data](../../workflows/visualize-data/SKILL.md).

A recipe says *what happens*; it doesn't say what it looks like. Design the look from the user's subject and the seed. The "best styles" named in each recipe point to the opt-in [motion-styles](../../design/motion-styles/SKILL.md) library: use one only if the user asks for it or accepts your one-line offer.

## Workflow

1. **Seed.** Draw a random seed before deciding anything creative. If an **apply-randomness** skill is available, use it; otherwise run `LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 256; echo`. Find a few verifiable patterns in it (digit runs, repeats, letter clusters) and let them choose between three concept directions you write, and between options for the central visual rule, the hero object and the look. Keep the seed and a one-line pattern → choice map in the brief.
2. **Brief.** Fill in the [brief template](references/brief.md): inputs (asked once, with defaults), concept with one central visual rule and one hero object, locked copy, look, motion, a banned list, structure, build rules, gates. If the user gave one line, write the brief yourself and make the calls.
3. **Structure.** A storyboard or a beat map with timestamps, using the recipe's beat proportions. With music, run `helios analyze` first and put structure on its downbeats.
4. **Read the demo for its technique,** not its composition. The demo shows how the hard part is built (the log zoom, the volume function, the summed springs). Your subject, look, structure and ending come from the brief.
5. **Stills gate.** Before the full render, render the recipe's named stills and a strip over the hardest 2–4 seconds. Each still should work as a poster.
   ```bash
   npx -y @helios-project/cli@latest still video.html --at 0.4,6.2,13.8,19.5
   npx -y @helios-project/cli@latest sheet video.html --strip 12.8:14.6 --fps 30
   npx -y @helios-project/cli@latest verify video.html --duration 20
   ```
6. **Render and check.**
   ```bash
   npx -y @helios-project/cli@latest render video.html -o video.mp4 --duration 20 --preset medium
   npx -y @helios-project/cli@latest check video.mp4
   ```
7. **Self-score and revise** on the seven axes in [brief.md](references/brief.md#self-score-and-revise). Fix the lowest first. If you can, have a fresh reviewer (a second agent) look at a contact sheet every 0.2–0.5 s and return ranked, timestamped problems.

## Rules that apply to every recipe

- **Every scene is made from the previous one.** Morph, carry, flood or match-cut; don't slideshow.
- **Facts come from a facts list.** Numbers, dates and claims are real or clearly invented. A mechanism computes its answer by its own motion.
- **Reading time.** Text holds for at least `letters / 15 + 1.5` seconds; text being read doesn't move decoratively.
- **Frame 1 is a finished picture,** and the last frame either holds a composed end card for about a second or equals frame 1 for a loop.
- **Works muted.** The story reads with the sound off.

[techniques.md](references/techniques.md) covers the failure modes that recur across genres: summed springs, two-edge springs, floods and irises, handoffs between scenes, text inside morphing containers, loop seams, preserve-3d flattening, motion blur that keeps counters sharp, footage as image sequences, glass and goo, baked simulations, and automatic checks for pops and frozen stretches.

## Credits

Genres, directives and gotchas were distilled from three public collections of code-made videos and their prompts: [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) (MIT list; prompts belong to their creators), [awesome-claude-5-5-videos](https://github.com/athemeroy/awesome-claude-5-5-videos) (CC BY 4.0 writing and analysis) and [opus-video-prompts](https://github.com/joeseesun/opus-video-prompts). Everything here is written in our own words; no prompt text is reproduced. See [THIRD_PARTY.md](../../THIRD_PARTY.md).
