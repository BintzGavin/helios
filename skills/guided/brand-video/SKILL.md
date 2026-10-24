---
name: guided-brand-video
description: Guided, brand-aligned marketing videos rendered with Helios — promo or hype, explainer or walkthrough, product demo or feature showcase, testimonial or social proof, launch or release announcement, and vertical social clips (Reels, TikTok, Shorts). Extracts the brand from a repo or URL, locks the format, randomizes structure and staging, and designs an original look from a seed so videos don't look alike. Optional beat-synced music and Internet Archive B-roll.
---

# Brand video

One pipeline for six formats. The format profile fixes structure and pacing ([references/formats.md](references/formats.md)). A random roll decides how the story is staged. The look is designed fresh for each video from the brand and a seed, the same way [make-video](../../../plugins/helios/skills/make-video/SKILL.md) does it. Known looks from [motion-styles](../../design/motion-styles/SKILL.md) are opt-in: use one only when the user asks for it.

Build the page under the make-video contract (one HTML page, `window.renderAt(t)`, every frame a pure function of `t`) and render, review and check as it describes. Read [motion-design-rules](../motion-design-rules/SKILL.md) before writing the spec.

Keep each video in its own folder, e.g. `videos/<slug>/`: `seed.txt`, `direction.json`, `spec.md`, `video.html`, `audio/`, `broll/`, `video.mp4`. Commit `direction.json`: the next video reads it to avoid repeating this one.

## 1. Gather context

⛔ Ask together, then wait:

1. "Are we in your brand's repository, or should I research a URL (e.g. your marketing site)?"
2. "Do you want generated background music (ElevenLabs; you'll need an API key set up), or do you have a track?"
3. "Should I pull B-roll from the Internet Archive (public-domain and Creative Commons film)?"

If they name or describe a style, a medium or a reference look, note it for step 5. Don't read `.env` files or check keys; trust the answers.

## 2. Brand

From a repo: Tailwind config or CSS variables, global styles, design tokens, logo, favicon, hero sections, marketing copy, CTAs, UI components, existing motion. From a URL: the same visible signals. Add the format's extra signals from its profile.

Write a brand profile: value proposition, audience, tone, palette, type, emotional position. The brand fixes facts, logo, product UI, and the colours and fonts that must appear. It doesn't dictate a visual style.

## 3. Lock the format

Pick the profile in [references/formats.md](references/formats.md) and apply its defaults: duration, aspect, arc, timing anchors, limits.

## 4. Roll the staging

Draw the seed with the **apply-randomness** skill if it's installed (save its output as `seed.txt`); otherwise:

```bash
LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 1024 > videos/<slug>/seed.txt
```

Then roll:

```bash
node <this-skill>/scripts/roll-direction.mjs --format promo \
  --seed-file videos/<slug>/seed.txt --avoid . --out videos/<slug>/direction.json
```

It picks one option on every axis in [references/direction-deck.json](references/direction-deck.json): structure, opening, ending, peak position, palette approach, camera path, layout, pacing, entrance emphasis, accent device, footage role, and one rule to break. It also draws three idea lenses for step 5 and lists earlier videos' looks. It skips what the last two videos used, and never pairs picks that overlap. Add `--no-broll` if B-roll was declined; `--lock axis=option` for anything the user or brand requires; `--style <slug>` when step 5 uses a style card.

Honor the picks. Up to two vetoes are allowed for a concrete brand or format conflict, re-rolled with `--lock` and written in the spec. "Something else would look better" isn't one.

## 5. Design the look

**Default: an original look,** found with [references/look-ideation.md](references/look-ideation.md):

1. Write down the obvious answers: the pun on the product's name, the category's usual look, the stock looks (dark gradient with floating orbs or particles, glass cards, word-by-word fade-ups, neon glow on black), and the `recent_looks` in `direction.json`. They're off limits unless the brief asks for one.
2. Write one candidate from each of the three random `lenses` the roll drew, plus one that drops an assumption all the obvious answers share.
3. Cut candidates that collapse into an obvious answer or into each other.
4. Let `roll-direction.mjs --pick <n>` choose among the survivors, and record the result in `picks.look.label`.

**Only when the user asks for a known look**, use the motion-styles library its own way:

- They name or describe a style or medium ("make it risograph", "like an old blueprint"): open that one card, and re-run the roll with `--style <slug>` so the history records it.
- They ask for options or "a known look": follow motion-styles to offer at most three styles plus one original direction, and build what they pick.

With a card, its invariants win: if it bans a rolled pick (Swiss bans bounce, risograph bans dissolves, a locked-camera style can't track), re-roll that axis with `--lock` to an option the card allows. Map brand colours into the card's colour rules. Never copy the card's demo composition.

Without being asked, you may offer once, in one line, that known styles exist.

## 6. Music (if wanted)

Generate an instrumental with ElevenLabs matching the brand tone, the format's music direction, the rolled pacing and the runtime, or use the user's track. Analyse it with `helios analyze` (or make-video's fallback) and key timing to it as make-video's music section and motion-design-rules Rule 7 describe. Without music, build the timing grid from the rolled pacing.

## 7. B-roll (if wanted and `broll` isn't `none`)

Use [archive-broll](../../workflows/archive-broll/SKILL.md). Grade every clip into the video's palette and materials so footage reads as part of the look.

## 8. Creative specification

One spec in a single code block, also saved as `spec.md`. Don't restate the prompt. Include:

- Duration, aspect, resolution, FPS, render mode
- Brand summary
- Format, every rolled pick, locks, vetoes and why
- The obvious answers, the four look candidates with their lenses, what was cut and why, the pick, and the seed pattern → choice map (or the style card the user asked for)
- Where the rule to break shows up, and what happens at the peak
- Scenes with exact timestamps, each keyed to a sound or time (W/B/H/F/T, Rule 7)
- Voiceover and on-screen text
- Per scene: layout, hero, layers, entrance, transition out
- Elements that persist across scenes
- Audio direction and assets (logo, UI, B-roll clips with ranges, fonts)

## 9. Build, review, render

Check two or three early stills of the real page as style frames: do they look like the chosen candidate and like nothing on the obvious list? Then build, render, sheet, `verify` and `check` as make-video describes.

CLI notes for 0.46.0: `still`, `sheet` and `verify` take no `--mode` (only `render` does), and `--fps` only applies to `sheet --strip`. `check`, `analyze` and `verify --cues` ship after 0.46.0; make-video's troubleshooting table has the fallbacks. Say in the report which checks didn't run.

Report the output path, format, seed, picks, the chosen look, locks and vetoes, B-roll credits, and anything unverified.
