---
name: guided-testimonial-video
description: End-to-end guided workflow for creating a social proof or testimonial video. Extracts brand identity from the repo, generates a warm soundtrack, and produces a trust-building motion.dev composition rendered via Helios CLI. Use when making customer testimonial, review highlight, or social proof videos.
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
• Testimonial sections or components
• Review/rating displays
• Customer logos or partner sections
• Trust badges or certification marks
• Social proof patterns (counters, stats, logos)
• Marketing copy and value propositions
• CTA structure

Construct internal brand profile:

• Core value proposition
• Target audience
• Tone of voice (warm, authentic, trustworthy)
• Visual density
• Primary palette
• Accent palette (warm tones for trust)
• Typography character
• Social proof strategy (quotes, stats, logos, or combination)

All creative decisions must align with this.

------------------------------------------------------------
STEP 4 — Generate Original Music (Skip if no music)

Use ElevenLabs with existing ELEVEN_LABS_API_KEY.

Generate instrumental track matching:

• Warm, uplifting tone
• Gentle build to emotional peak
• Inspiring but not aggressive
• Target runtime

Save audio locally.

------------------------------------------------------------
STEP 5 — Analyze Audio With ffmpeg (Skip if no music)

Extract:

• BPM
• Beat timestamps
• Downbeats
• Energy peaks

Create beat timing map.

Quote reveals must land on downbeats.
Name/title reveals should align to beats.

------------------------------------------------------------
STEP 6 — Read Motion Design Rules

Before producing the creative specification, read and internalize:

skills/guided/motion-design-rules

Every rule in that skill is mandatory for this composition.

------------------------------------------------------------
STEP 7 — Produce Creative Specification

You are a senior creative director and brand trust architect designing for Helios using motion.dev.

Input example:
make a 30 second testimonial video

Output:

• One structured creative specification
• Wrapped in a single code block
• No explanation outside it

The specification must include:

• Duration
• Aspect ratio (16:9)
• Brand summary
• Motion language (warm, elegant, deliberate)
• Beat synchronized scene breakdown
• Exact timestamps
• Voiceover (optional — may use text-only approach)
• On screen text (quotes, attribution, stats, CTA)
• Visual composition (quote cards, avatars, star ratings, customer logos)
• Explicit motion.dev animation behavior
• Transition logic (gentle fades, soft slides, subtle scale)
• Layering order (background texture → quote card → avatar/photo → attribution → stats)
• Audio direction
• Asset requirements
• Typography hierarchy (quote text large, attribution smaller, stats prominent)

Use motion.dev compatible terminology only.

Testimonial structure requirements:

• Opening brand moment or context setter (2-3 seconds)
• Quote 1: Full quote with attribution
• Quote 2: Full quote with attribution (if duration allows)
• Social proof stats (numbers, ratings, customer count)
• Closing CTA with brand mark

Each quote segment:
• Quote text animates in (typewriter or fade-in by line)
• Brief pause for reading
• Attribution appears (name, title, company)
• Optional: customer company logo or avatar

------------------------------------------------------------
STEP 8 — Implement DOM Based Helios Composition

Using the creative specification:

Create a composition.html file that:

• Uses HTML + CSS + motion.dev
• Implements animations using WAAPI / CSS / motion.dev
• Aligns quote reveals to downbeats
• Uses elegant quote card typography
• Includes quotation mark decorative elements
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
• Quotes must remain readable for minimum 4 seconds each
• Star ratings should animate sequentially

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
Show 1 quote + 1 stat + CTA. Prioritize the strongest quote.

If no duration specified
Default to 30 seconds.

Maximum 3 quotes for any duration.
Quotes must be real or representative — never fabricate.
If no testimonials exist in the repo, use placeholder structure with clear labels.

Never restate the original prompt.
Never explain reasoning.
Creative specification must be output inside a single code block only.
