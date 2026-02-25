---
name: guided-product-demo
description: End-to-end guided workflow for creating a product demo or showcase video. Extracts brand identity from the repo, generates a polished soundtrack, and produces a feature-focused motion.dev composition rendered via Helios CLI. Use when making product demos, feature showcases, or UI walkthroughs.
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
STEP 3 — Extract Brand Intelligence and Product Features From Repo

If the user provided a URL instead of a repo, fetch that URL and extract
the same brand signals from the live site. Skip codebase-specific items
(Tailwind config, design tokens, etc.) and focus on visible brand elements.

Analyze:

• Tailwind config or CSS variables
• Global stylesheets
• Design tokens
• Logo assets
• Favicon
• UI components (buttons, forms, cards, modals)
• Page layouts and routing structure
• Feature flags or feature directories
• API endpoints (reveals product capabilities)
• Dashboard or admin interfaces
• Settings pages (reveals configurable features)
• README feature lists
• Marketing copy and hero sections
• Screenshots or demo assets

Construct internal brand profile:

• Core value proposition
• Target audience
• Tone of voice (professional, innovative, approachable)
• Visual density
• Primary palette
• Accent palette
• Typography character
• Product category (SaaS, dev tool, e-commerce, etc.)

Construct product feature map:

• Top 3-5 signature features
• Primary user workflow
• Key UI surfaces
• Differentiating capabilities

All creative decisions must align with this.

------------------------------------------------------------
STEP 4 — Generate Original Music (Skip if no music)

Use ElevenLabs with existing ELEVEN_LABS_API_KEY.

Generate instrumental track matching:

• Professional, modern tone
• Building energy (matches progressive feature reveals)
• Clean and polished feel
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

Feature reveals must land on downbeats.
UI transitions should align to beats.

------------------------------------------------------------
STEP 6 — Read Motion Design Rules

Before producing the creative specification, read and internalize:

skills/guided/motion-design-rules

Every rule in that skill is mandatory for this composition.

------------------------------------------------------------
STEP 7 — Produce Creative Specification

You are a senior creative director and product marketing architect designing for Helios using motion.dev.

Input example:
make a 45 second product demo

Output:

• One structured creative specification
• Wrapped in a single code block
• No explanation outside it

The specification must include:

• Duration
• Aspect ratio (16:9)
• Brand summary
• Product feature map
• Motion language (precise, deliberate, polished)
• Beat synchronized scene breakdown
• Exact timestamps per feature
• Voiceover script (benefit-driven, concise)
• On screen text (feature names, benefit callouts, labels)
• Visual composition (mockup frames, UI highlights, zoom regions)
• Explicit motion.dev animation behavior
• Transition logic (zoom-ins for detail, pan-outs for context, smooth crossfades)
• Layering order (background → UI mockup → highlight overlay → text → cursor/pointer)
• Audio direction
• Asset requirements
• Cursor or pointer choreography

Use motion.dev compatible terminology only.

Demo structure requirements:

• Opening brand moment (2-3 seconds)
• Feature 1: Show + Tell
• Feature 2: Show + Tell
• Feature 3: Show + Tell
• Closing CTA with product name

Each feature segment:
• Establish context (wide view)
• Zoom to detail (highlight interaction)
• Show result (benefit visible)

------------------------------------------------------------
STEP 8 — Implement DOM Based Helios Composition

Using the creative specification:

Create a composition.html file that:

• Uses HTML + CSS + motion.dev
• Implements animations using WAAPI / CSS / motion.dev
• Aligns feature reveals to downbeats
• Uses UI mockup frames with highlight overlays
• Includes cursor/pointer animations for interaction simulation
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
• UI mockups must be pixel-accurate representations
• Highlight regions must use subtle glow or border emphasis

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

If duration ≤ 30 seconds
Show maximum 2 features. Prioritize the strongest differentiator.

If no duration specified
Default to 45 seconds.

Maximum 5 features for any duration.
Each feature must have at least 5 seconds of screen time.
Never show a feature without explaining the benefit.

Never restate the original prompt.
Never explain reasoning.
Creative specification must be output inside a single code block only.
