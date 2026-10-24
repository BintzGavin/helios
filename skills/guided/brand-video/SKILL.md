---
name: guided-brand-video
description: Guided, brand-aligned marketing videos rendered with Helios — promo or hype, explainer or walkthrough, product demo or feature showcase, testimonial or social proof, launch or release announcement, and vertical social clips (Reels, TikTok, Shorts). Extracts the brand from a repo or URL, picks the best-fitting motion style, then randomizes everything the format and style leave open so videos don't look alike. Optional beat-synced music and Internet Archive B-roll.
---

# Brand video

One pipeline for six formats. The format profile fixes structure and pacing ([references/formats.md](references/formats.md)). A motion style fixes the look ([motion-styles](../../design/motion-styles/SKILL.md)). Randomness, applied **after** both are locked, decides everything else. Locking first and randomizing second is the point: a good fit alone collapses every promo for every dev tool into the same video; randomness alone ignores the brief.

Build the page under the [make-video](../../../plugins/helios/skills/make-video/SKILL.md) contract (one HTML page, `window.renderAt(t)`, every frame a pure function of `t`) and render, review and check as it describes. Read [motion-design-rules](../motion-design-rules/SKILL.md) before writing the spec; where it conflicts with the style card, the card wins.

Keep each video in its own folder, e.g. `videos/<slug>/`: `seed.txt`, `direction.json`, `spec.md`, `video.html`, `audio/`, `broll/`, `video.mp4`. Commit `direction.json`: the next video reads it to avoid repeating this one.

## 1. Gather context

⛔ Ask together, then wait:

1. "Are we in your brand's repository, or should I research a URL (e.g. your marketing site)?"
2. "Do you want generated background music (ElevenLabs; you'll need an API key set up), or do you have a track?"
3. "Should I pull B-roll from the Internet Archive (public-domain and Creative Commons film)?"

If they name a style or a look, note it for step 4. Don't read `.env` files or check keys; trust the answers.

## 2. Brand

From a repo: Tailwind config or CSS variables, global styles, design tokens, logo, favicon, hero sections, marketing copy, CTAs, UI components, existing motion. From a URL: the same visible signals. Add the format's extra signals from its profile.

Write a brand profile: value proposition, audience, tone, palette, type, emotional position. The brand fixes facts, logo, product UI, and the colours that must appear. It doesn't pick the visual style.

## 3. Lock the format

Pick the profile in [references/formats.md](references/formats.md) and apply its defaults: duration, aspect, arc, timing anchors, limits.

## 4. Lock the style

Read the [style catalog](../../design/motion-styles/references/catalog.md). Shortlist every style that fits the format, the subject and the brand's tone — usually 2–4, best first. Fit means: the "Best for" column matches, the card's colour rules can carry the brand's colours, and its type and motion suit the tone.

- The user named a style: shortlist only that one.
- A strict brand system leaves no room: shortlist styles whose colour rules accept brand colours (e.g. `swiss-grid`, `dark-keynote`, `flat-vector`), and lock `palette=brand-mapped` in step 5.
- Never shortlist a style that fits worse just for variety; never drop one that fits because it was used last time. The script handles repetition.

## 5. Roll the rest

Draw the seed with the **apply-randomness** skill if it's installed (save its output as `seed.txt`); otherwise:

```bash
LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 1024 > videos/<slug>/seed.txt
```

Then roll:

```bash
node <this-skill>/scripts/roll-direction.mjs --format promo \
  --styles dark-keynote,aurora-glass,swiss-grid \
  --seed-file videos/<slug>/seed.txt --avoid . --out videos/<slug>/direction.json
```

It picks the style from the shortlist (skipping the last two videos' styles when another fits) and one option on every open axis in [references/direction-deck.json](references/direction-deck.json): structure, opening, ending, peak position, palette variant, camera path, layout, pacing, entrance emphasis, accent device, footage role, and one rule to break. Add `--no-broll` if B-roll was declined; `--lock axis=option` for anything the user or brand requires.

Now read the chosen style's card start to finish. Then:

- **Card wins.** If the card bans a pick (Swiss bans bounce, risograph bans dissolves, a locked-camera style can't track), re-run with `--lock` set to an option the card allows, same seed. Note it in the spec.
- **Honor the rest.** Up to two other vetoes are allowed only for a concrete brand or format conflict, written in the spec. "Something else would look better" isn't one.
- **Read the seed string** for what no axis covers, as the card's "Vary within the style" section describes: subject framing, which native move goes at the peak, the central visual metaphor. Write a one-line pattern → choice map in the spec.
- **Seeded texture.** Use `direction.seed` with mulberry32 (in the script) for grain, scatter, registration offsets. Never `Math.random()`.

## 6. Music (if wanted)

Generate an instrumental with ElevenLabs matching the brand tone, the format's music direction, the rolled pacing and the runtime, or use the user's track. Analyse it with `helios analyze` and key timing to it as make-video's music section and motion-design-rules Rule 7 describe. Without music, build the timing grid from the rolled pacing.

## 7. B-roll (if wanted and `broll` isn't `none`)

Use [archive-broll](../../workflows/archive-broll/SKILL.md). Grade every clip into the card's palette and materials (duotone, halftone, ink plates) so footage reads as part of the style.

## 8. Creative specification

One spec in a single code block, also saved as `spec.md`. Don't restate the prompt. Include:

- Duration, aspect, resolution, FPS, render mode (from the card's route)
- Brand summary
- Format, style, and every rolled pick; locks, vetoes and why; the seed pattern → choice map
- Where the rule to break shows up, and the native move at the peak
- Scenes with exact timestamps, each keyed to a sound or time (W/B/H/F/T, Rule 7)
- Voiceover and on-screen text
- Per scene: layout, hero, layers, entrance, transition out
- Elements that persist across scenes
- Audio direction and assets (logo, UI, B-roll clips with ranges, fonts)

## 9. Build, review, render

Build with the card's core technique and your own composition, never the demo's. Make style frames first and check them against the card's signature checklist. Then render, sheet, `verify` and `check` as make-video describes.

Before handing over, compare against the card's demo on structure, opening, signature shot, camera path, rhythm and ending: at least four must differ. Report the output path, format, style, seed, picks, locks and vetoes, B-roll credits, and anything unverified.
