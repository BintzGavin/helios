---
name: guided-promo-video
description: End-to-end guided workflow for creating a promotional hype video. Extracts brand identity from the repo, generates beat-synced music, and produces a high-energy motion.dev composition rendered via Helios CLI. Use when making brand-aligned promo or hype videos.
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
• Hero sections
• Marketing copy
• CTA structure
• Product positioning
• UI components
• Existing motion usage

Construct internal brand profile:

• Core value proposition
• Target audience
• Tone of voice
• Visual density
• Primary palette
• Accent palette
• Typography character
• Emotional positioning

All creative decisions must align with this.

------------------------------------------------------------
STEP 4 — Generate Original Music (Skip if no music)

Use ElevenLabs with existing ELEVEN_LABS_API_KEY.

Generate instrumental track matching:

• Brand tone
• Emotional arc
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

All animations must align to this timing map.

------------------------------------------------------------
STEP 6 — Read Motion Design Rules

Before producing the creative specification, read and internalize:

skills/guided/motion-design-rules

Every rule in that skill is mandatory for this composition.

------------------------------------------------------------
STEP 7 — Produce Creative Specification

You are a senior creative director and motion systems architect designing for Helios using motion.dev.

Input example:
make a 15 second hype video

Output:

• One structured creative specification
• Wrapped in a single code block
• No explanation outside it

The specification must include:

• Duration
• Aspect ratio
• Brand summary
• Motion language
• Beat synchronized scene breakdown
• Exact timestamps
• Voiceover
• On screen text
• Visual composition
• Explicit motion.dev animation behavior
• Transition logic
• Layering order
• Audio direction
• Asset requirements

Use motion.dev compatible terminology only.

------------------------------------------------------------
STEP 8 — Implement DOM Based Helios Composition

Using the creative specification:

Create a composition.html file that:

• Uses HTML + CSS + motion.dev
• Implements animations using WAAPI / CSS / motion.dev
• Aligns animations to beat timestamps
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

------------------------------------------------------------
STEP 9 — Render Using Official Helios CLI (DOM Mode)

Render with:

npx helios render ./composition.html -o output.mp4

Requirements:

• Correct aspect ratio
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
Prioritize punch and clarity.

If no duration specified
Default to 30 seconds.

Never restate the original prompt.
Never explain reasoning.
Creative specification must be output inside a single code block only.
