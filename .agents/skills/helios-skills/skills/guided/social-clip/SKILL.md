---
name: guided-social-clip
description: End-to-end guided workflow for creating a short-form social media clip (Reels, TikTok, Shorts). Extracts brand identity from the repo, generates a punchy soundtrack, and produces a vertical 9:16 motion.dev composition rendered via Helios CLI. Use when making Instagram Reels, TikTok videos, YouTube Shorts, or other vertical short-form content.
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
• Marketing copy (short-form hooks)
• CTA structure
• Product positioning
• UI components
• Existing motion usage
• Social media links or handles

Construct internal brand profile:

• Core value proposition (condensed to one line)
• Target audience
• Tone of voice (bold, immediate, trend-aware)
• Visual density (high — vertical real estate is limited)
• Primary palette
• Accent palette (high contrast for mobile screens)
• Typography character (large, bold, high readability on small screens)
• Social media presence and handle

All creative decisions must align with this.

------------------------------------------------------------
STEP 4 — Generate Original Music (Skip if no music)

Use ElevenLabs with existing ELEVEN_LABS_API_KEY.

Generate instrumental track matching:

• High energy, immediate hook
• Short, punchy structure
• Loop-friendly (ending should connect to beginning)
• Trending audio aesthetics
• Target runtime (15 seconds or less)

Save audio locally.

------------------------------------------------------------
STEP 5 — Analyze Audio With ffmpeg (Skip if no music)

Extract:

• BPM
• Beat timestamps
• Downbeats
• Energy peaks

Create beat timing map.

Every visual change must land on a beat.
No animation should occur between beats.

------------------------------------------------------------
STEP 6 — Read Motion Design Rules

Before producing the creative specification, read and internalize:

skills/guided/motion-design-rules

Every rule in that skill is mandatory for this composition.

------------------------------------------------------------
STEP 7 — Produce Creative Specification

You are a senior creative director and social media content architect designing for Helios using motion.dev.

Input example:
make a 15 second reel for our product

Output:

• One structured creative specification
• Wrapped in a single code block
• No explanation outside it

The specification must include:

• Duration
• Aspect ratio (9:16 — VERTICAL)
• Resolution (1080x1920)
• Brand summary
• Motion language (punchy, kinetic, immediate)
• Beat synchronized scene breakdown
• Exact timestamps
• On screen text (bold, large, centered, max 5 words per screen)
• Visual composition (full-bleed, edge-to-edge, no margins wasted)
• Explicit motion.dev animation behavior
• Transition logic (hard cuts on beats, slam zooms, snap rotations)
• Layering order
• Audio direction
• Asset requirements
• Loop point (how the end connects visually to the start)

Use motion.dev compatible terminology only.

Social clip structure requirements:

• Hook (first 1-2 seconds) — most important
  Immediate visual punch. No build-up. Grab attention instantly.
• Core (middle 60-70% of duration)
  Rapid-fire content delivery. One idea per beat.
• Payoff (final 2-3 seconds)
  CTA or brand moment. Connect back to hook for loop.

Typography rules:

• Maximum 5 words per text screen
• Minimum 72px equivalent font size
• Always centered vertically
• Safe zone: avoid top 10% and bottom 15% (UI overlays)
• High contrast against background (use text shadows or backplates)

------------------------------------------------------------
STEP 8 — Implement DOM Based Helios Composition

Using the creative specification:

Create a composition.html file that:

• Uses HTML + CSS + motion.dev
• Uses 1080x1920 resolution (9:16 vertical)
• Implements animations using WAAPI / CSS / motion.dev
• Aligns every visual change to a beat timestamp
• Uses bold typography with safe zone margins
• Includes generated audio file
• Has exact duration
• Feels loop-friendly (last frame relates to first frame)

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
• No text in top 10% or bottom 15% of frame
• All text must be readable at 1x phone size
• Transitions must be hard and immediate — no slow fades

------------------------------------------------------------
STEP 9 — Render Using Official Helios CLI (DOM Mode)

Render with:

npx helios render ./composition.html -o output.mp4

Requirements:

• 9:16 aspect ratio (1080x1920)
• Correct duration
• Audio attached
• CSS and WAAPI fully synchronized
• High quality MP4 output

Output file must be:

output.mp4

------------------------------------------------------------
RUNTIME RULES
------------------------------------------------------------

If duration > 60 seconds
Reject. Social clips must be ≤ 60 seconds.

If no duration specified
Default to 15 seconds.

If no aspect ratio specified
Default to 9:16 (vertical).

First frame must hook. No logos, no intros, no build-up.
Every beat must have a visual change.
Text must be scannable in under 1 second per screen.

Never restate the original prompt.
Never explain reasoning.
Creative specification must be output inside a single code block only.
