---
name: motion-design-rules
description: Motion design framework for programmatic video. Defines anti-slideshow architecture, depth, one easing personality, choreography, the squint test, transitions, timing to music and voice, and checks a script can run. Stated so it holds in any look; a motion-styles card overrides it where they conflict. Reference this skill from any guided video skill.
---

These rules apply to every Helios video composition.
Read them before producing a creative specification or writing composition code.

They describe how motion must behave, not what the video must look like.
The look comes from the video's own direction: an original one designed
from a seed, or a design/motion-styles card when the user asked for one.
Where a card's invariants conflict with a rule here, the card wins. When the rolled twist breaks one of
these rules, break it once, on purpose, and say where in the spec.

------------------------------------------------------------
RULE 1 — Anti-Slideshow Architecture
------------------------------------------------------------

The biggest mistake in code-based video is building a PowerPoint
(Scene A fades out → Scene B fades in).

Separate all elements into two categories:

GLOBAL elements persist across scenes: the ground, the camera,
a brand mark, a recurring shape or accent device, a footage plate.

LOCAL elements are scene-specific: hero text, supporting details,
stats, scene imagery.

Global elements never reset between scenes. They move, recolour,
resize or change role, but never disappear and reappear. The video
reads as one continuous world. What the global elements are comes
from the look: paper and ink, a grid, a terminal, one long canvas.
Floating orbs are not a default.

------------------------------------------------------------
RULE 2 — Depth
------------------------------------------------------------

A flat composition looks amateur unless flatness is the point.
Give every frame readable planes:

• Ground — the look's base: paper, colour field, grid, footage,
  gradient. Never pure black unless the style calls for it.
• Context — supporting shapes, rules, labels, accents. They move
  slower than the hero (parallax).
• Hero — the one thing to read. Highest contrast, sharpest edges.

Depth can come from scale, overlap, blur, parallax, shadow or
masking: pick what suits the look. Looks built on empty space
get depth from scale and placement alone.

------------------------------------------------------------
RULE 3 — Physics Engine (Global Easing)
------------------------------------------------------------

Use ONE easing personality for the whole video: the one in the
direction (or the style card's, if there is one). Choose it for the
look and the brand, not by habit, and keep it. Write it in the spec as one constant:

physics: { easing: "circOut", defaultDuration: 0.4 }

Every animation references that constant. Camera moves that start
and end at rest may use the in-out form of the same curve family.
Break it otherwise only for a named creative reason in the spec.

------------------------------------------------------------
RULE 4 — Choreography and Staggering
------------------------------------------------------------

Nothing appears all at once. Each scene builds in order:

1. The ground or camera shifts (sets the stage)
2. Context elements arrive
3. The hero arrives with the rolled entrance emphasis
4. Supporting details follow one by one

Stagger child elements by energy level, at the unit the entrance
names (letters, words, lines, strokes, pieces):

High energy (promo, social): 50–80ms
Medium energy (demo, launch): 80–120ms
Low energy (explainer, testimonial): 100–150ms

Avoid the uniform reflex: one identical fade-up on every element in
every scene. Use the main entrance pattern plus at most one contrasting
pattern for emphasis.

Exits overlap the next scene's entrance by at least 200ms, unless the
cut is hard by design (the look, or a cut on a beat — Rule 7).

------------------------------------------------------------
RULE 5 — The Squint Test
------------------------------------------------------------

Before finalizing, look at five frames spread across the video
and squint:

• Can you instantly identify the most important element? (Hierarchy)
• Is there enough negative space? (Breathing room)
• More than 3 competing focal points? (Clutter — delete something)
• Does every visible element serve a purpose? (No decoration for decoration's sake)
• Could someone describe the look in a few words? (If not, commit harder)

If a frame fails, simplify or commit. Space is a design element.

------------------------------------------------------------
RULE 6 — Transition Continuity
------------------------------------------------------------

A scene change never lands on silence or an empty frame.

During every transition:

• At least one global element stays visually continuous
• Outgoing and incoming scenes overlap, or the cut is exact and a
  persistent element carries across it
• Audio energy (if present) bridges the change
• Palette shifts are gradual unless the look swaps colour fields

Use transitions that belong to the look (and that a style card, if
any, allows), and vary them rather than repeating one.

Avoid: full-black gaps, simultaneous fade-out/fade-in, and a hard cut
that nothing carries across.

With music, a hard cut that lands on a kick or a downbeat is a
transition in its own right: the beat carries it. See Rule 7.

------------------------------------------------------------
RULE 7 — Timing Answers the Sound
------------------------------------------------------------

When there is a soundtrack, every timed thing answers something
you can hear. Get the beat map first:

  npx -y @helios-project/cli@latest analyze track.mp3   # writes track.beats.json

It holds beats and downbeats that follow the track's real tempo,
which drifts, plus kick/snare/hat onsets, the big hits, risers,
sections and per-frame loudness envelopes. Never lay a grid from
one BPM on a real song: it is a beat off within a minute.

Key every timed thing to one of these, and say which in the spec:

• W  a word's time (lyrics, captions, voice-over)
• B  the beat grid (beats, downbeats, bars)
• H  a track event (kick, snare, impact, riser, envelope)
• F  a fixed time in the video
• T  a moment measured in footage or a clip

Rules:

• The motion syncs to the beat; the word syncs to the voice.
  A lyric or caption appears at its spoken or sung time, never
  snapped to the nearest beat.
• Cuts land on downbeats, kicks or snares. Camera moves answer
  sounds: a small punch on kicks, a push that rides a riser into
  the hit it lands on, a bigger move on real impacts.
• An entrance takes at most an eighth of a beat when it marks a
  beat; a snap keyed early reads as early.
• Hold still where the music breathes. No shake in a drumless
  intro. Let a calm song be calm: fewer cuts, longer shots.
• Flashes belong to an idea, on hits only, and never more than
  three in any second (WCAG 2.3.1). `helios check video.mp4`
  measures it.
• The accent colour goes on at most two elements in a frame.
• Two on-screen numbers that mean the same thing are driven by
  the same value.

------------------------------------------------------------
RULE 8 — Checks a Script Can Run
------------------------------------------------------------

A check a script can run beats a judgement. Before handing over:

• `helios verify page.html` — every frame depends only on t.
• `helios verify page.html --cues lyrics.srt` — every lyric,
  caption or word is on screen at its time (N/N). Canvas pages
  declare what they drew with `window.heliosDrawnText?.add(text)`.
• `helios sheet` at the moments that matter, not at random: the
  first, middle and last frame of every scene, every hit, every
  entrance, the middle of every transition. Open the sheet and
  look; a sheet nobody looked at is not a review.
• `helios check video.mp4` on the final file — flashing and
  colour tags.

`check`, `analyze` and `verify --cues` need CLI 0.47.0 or later. If
yours lacks them, use the fallbacks in make-video's troubleshooting
table and say which checks didn't run.

If a reviewer can see a problem and no check catches it, add a
check.
