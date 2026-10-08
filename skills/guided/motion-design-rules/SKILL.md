---
name: motion-design-rules
description: Motion design framework for programmatic video. Defines anti-slideshow architecture, visual layering, physics-based easing, choreography rules, and quality validation. Reference this skill from any guided video skill.
---

These rules apply to every Helios video composition.
Read and internalize these before producing a creative specification or writing composition code.

------------------------------------------------------------
RULE 1 — Anti-Slideshow Architecture
------------------------------------------------------------

The biggest mistake in code-based video is building a PowerPoint
(Scene A fades out → Scene B fades in).

The camera never stops.

Separate all elements into two categories:

GLOBAL elements persist across scenes:
• Background texture or gradient
• Floating particles, orbs, or accent shapes
• Logo or brand mark
• Ambient motion (slow drift, subtle pulse)

LOCAL elements are scene-specific:
• Hero text for that scene
• Supporting details, stats, or callouts
• Scene-specific imagery

Global elements must NOT reset between scenes.
They morph, shift, or evolve — but never disappear and reappear.

This creates the illusion of a single continuous world
rather than a sequence of separate slides.

------------------------------------------------------------
RULE 2 — The Visual Stack (Minimum 4 Layers)
------------------------------------------------------------

Every frame must have at least 4 layers of depth.
A flat composition looks amateur.

Layer 0 — The Void
Base color or deep gradient. Never pure black unless intentional.

Layer 1 — The Texture
Subtle noise, gradient drift, grid lines, or slow-moving video.
This layer is never static. It always breathes.

Layer 2 — The Context
Floating shapes, lines, accent UI elements, or particles.
These sit behind the hero content but in front of the background.
They move slower than foreground elements (parallax).

Layer 3 — The Hero
Primary content: text, images, product UI.
Highest contrast. Sharpest edges. Draws the eye immediately.

If a frame has fewer than 3 visible layers, add depth.

------------------------------------------------------------
RULE 3 — Physics Engine (Global Easing)
------------------------------------------------------------

Define ONE global easing personality for the entire video.
Every animation must use this easing unless there is a specific
creative reason to break the rule.

Match the easing to brand identity:

• Tech / Developer / Hacker → circOut (fast start, hard brake)
• Luxury / Spa / Premium → easeInOut (slow start, slow end)
• Playful / Consumer / Fun → spring (overshoot and wobble)
• Corporate / Enterprise → easeOut (controlled deceleration)
• Bold / Startup / Energy → backOut (slight overshoot, confident)

Define this in the creative specification as:

physics: { easing: "circOut", defaultDuration: 0.4 }

All motion.dev / WAAPI animations must reference this constant.

------------------------------------------------------------
RULE 4 — Choreography and Staggering
------------------------------------------------------------

Nothing ever appears all at once.

The entrance order for every scene:

1. Background shifts or evolves (sets the stage)
2. Context elements animate in (lines, shapes, accents)
3. Hero text staggers in (word by word or line by line)
4. Supporting details cascade (one by one, not simultaneously)

The stagger delay between child elements should be
50ms–150ms depending on energy level.

High energy (promo, social): 50–80ms stagger
Medium energy (demo, launch): 80–120ms stagger
Low energy (explainer, testimonial): 100–150ms stagger

Exit animations must overlap with the next scene's entrance
by at least 200ms. Scenes should crossfade, not swap.

------------------------------------------------------------
RULE 5 — The Squint Test
------------------------------------------------------------

Before finalizing the composition, pause at 5 random frames
and mentally "squint" at the layout.

Check:

• Can you instantly identify the most important element? (Hierarchy)
• Is there enough negative space? (Breathing room)
• Are there more than 3 competing focal points? (Clutter — delete something)
• Does every visible element serve a purpose? (No decoration for decoration's sake)

If any frame fails the squint test, simplify.
Space is a design element, not just empty pixels.

------------------------------------------------------------
RULE 6 — Transition Continuity
------------------------------------------------------------

Scene transitions must never be a hard cut followed by silence.

During every transition:

• At least one global element must be visually continuous
• The outgoing scene's exit and incoming scene's entrance must overlap
• Audio energy (if present) should bridge the transition
• Color palette shifts should be gradual, not abrupt

Preferred transition patterns:

• Wipe with persistent background
• Scale-out hero → scale-in new hero (camera metaphor)
• Directional slide (content moves as if camera is panning)
• Morphing shapes that carry energy between scenes

Avoid: hard cuts, full-black gaps, simultaneous fade-out/fade-in.
