---
name: guided-launch-announcement
description: End-to-end guided workflow for creating a product launch or release announcement video. Extracts brand identity from the repo, generates a cinematic soundtrack, and produces a reveal-driven motion.dev composition rendered via Helios CLI. Use when making launch announcements, release videos, or product reveals.
---

You may be operating inside the brand's repository, or working from an external context.

Do not guess brand identity. Either analyze the codebase or research the provided URL.

------------------------------------------------------------
EXECUTION PIPELINE
------------------------------------------------------------

STEP 1 — Gather Context

⛔ STOP. Ask the user these two questions:

1. "Are we inside your brand's repository, or would you like to provide a URL (e.g. your marketing site) so I can research your brand online?"

2. "Would you like generated background music? If yes, you'll need an ELEVEN_LABS_API_KEY in your environment. You can get one at https://elevenlabs.io → Profile → API Keys."

Wait for the user to respond to both questions.

Do not attempt to read .env files or verify keys yourself.
Trust the user's responses.

If the user provides a URL, use it for brand research in STEP 3 instead of analyzing the codebase.
If the user declines music, skip STEP 4 and STEP 5.


------------------------------------------------------------
STEP 2 — Ensure Helios Runtime Dependencies

Install required packages:

npm install @helios-project/core @helios-project/renderer @helios-project/cli

You will render using DOM mode.

------------------------------------------------------------
STEP 3 — Extract Brand Intelligence From Repo

If the user provided a URL instead of a repo, fetch that URL and extract
the same brand signals from the live site. Skip codebase-specific items
(Tailwind config, design tokens, etc.) and focus on visible brand elements.

Analyze:

• Tailwind config or CSS variables
• Global stylesheets
• Design tokens
• Logo assets
• Favicon
• Changelog or release notes
• Version numbers and release history
• New feature implementations (recent commits, new files)
• Hero sections
• Marketing copy
• Product name and tagline
• Announcement or blog post components
• UI components
• Existing motion usage

Construct internal brand profile:

• Core value proposition
• Target audience
• Tone of voice (exciting, confident, momentous)
• Visual density
• Primary palette
• Accent palette (highlight/celebration colors)
• Typography character
• Product maturity (v1 launch vs iterative release)
• Announcement magnitude (major vs minor)

All creative decisions must align with this.

------------------------------------------------------------
STEP 4 — Generate Original Music (Skip if no music)

Use ElevenLabs with existing ELEVEN_LABS_API_KEY.

Generate instrumental track matching:

• Cinematic build-up energy
• Clear crescendo moment (for the reveal)
• Triumphant resolution
• Target runtime

Save audio locally.

------------------------------------------------------------
STEP 5 — Analyze Audio With ffmpeg (Skip if no music)

Extract:

• BPM
• Beat timestamps
• Downbeats
• Energy peaks
• Crescendo peak timestamp

Create beat timing map.

The reveal moment must land on the crescendo peak.
Feature highlights must align to beats after the reveal.

------------------------------------------------------------
STEP 6 — Read Motion Design Rules

Before producing the creative specification, read and internalize:

skills/guided/motion-design-rules

Every rule in that skill is mandatory for this composition.

------------------------------------------------------------
STEP 7 — Produce Creative Specification

You are a senior creative director and launch event architect designing for Helios using motion.dev.

Input example:
make a 30 second launch announcement for v2.0

Output:

• One structured creative specification
• Wrapped in a single code block
• No explanation outside it

The specification must include:

• Duration
• Aspect ratio (16:9)
• Brand summary
• What is being launched (version, feature, product)
• Motion language (cinematic, dramatic, celebratory)
• Beat synchronized scene breakdown
• Exact timestamps
• Voiceover script (announcement-style, confident)
• On screen text (version number, feature names, tagline, date)
• Visual composition (countdown elements, reveal animations, feature cards)
• Explicit motion.dev animation behavior
• Transition logic (build tension → reveal → celebrate → details)
• Layering order (dark background → particles/atmosphere → text → product reveal → feature cards)
• Audio direction
• Asset requirements

Use motion.dev compatible terminology only.

Launch structure requirements:

• Act 1 — Tension (first 30% of duration)
  Atmospheric build, teaser text, countdown energy
• Act 2 — Reveal (next 20% of duration)
  Product name or version number dramatic reveal on crescendo
• Act 3 — Showcase (next 35% of duration)
  Key features/changes highlighted with rapid-fire cards
• Act 4 — CTA (final 15% of duration)
  Call to action, availability date, brand sign-off

------------------------------------------------------------
STEP 8 — Implement DOM Based Helios Composition

Using the creative specification:

Create a composition.html file that:

• Uses HTML + CSS + motion.dev
• Implements animations using WAAPI / CSS / motion.dev
• Aligns reveal moment to audio crescendo
• Uses dramatic scale and opacity transitions for the reveal
• Includes atmospheric elements (particles, glows, gradients)
• Includes generated audio file
• Has exact duration

Expose Helios runtime:

```js
import { helios } from "@helios-project/core";

window.helios = helios;

helios.bindToDocumentTimeline({
  autoSyncAnimations: true
});
```

Requirements:

• window.helios must be defined
• helios.bindToDocumentTimeline() must be called
• autoSyncAnimations: true must be enabled
• All CSS and WAAPI animations must sync correctly
• No randomness
• Deterministic timing
• Reveal moment must feel impactful — use scale, glow, and flash
• Feature cards must animate sequentially, not simultaneously

------------------------------------------------------------
STEP 9 — Render Using Official Helios CLI (DOM Mode)

Render with:

npx helios render ./composition.html -o output.mp4

Requirements:

• 16:9 aspect ratio
• Correct duration
• Audio attached
• CSS and WAAPI fully synchronized
• High quality MP4 output

Output file must be:

output.mp4

------------------------------------------------------------
RUNTIME RULES
------------------------------------------------------------

If duration ≤ 15 seconds
Skip Act 1. Open with immediate reveal. Show max 2 features.

If no duration specified
Default to 30 seconds.

Maximum 5 feature highlights for any duration.
The reveal moment is the emotional peak — everything builds toward it.
Version numbers and dates must be visually prominent.

Never restate the original prompt.
Never explain reasoning.
Creative specification must be output inside a single code block only.
