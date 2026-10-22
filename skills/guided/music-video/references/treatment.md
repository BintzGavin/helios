# Treatment, storyboard and timeline

## Treatment template

```markdown
# <Song> — treatment

**Concept.** One paragraph. What world is this, and what changes across the song?
**Motif.** The one thing that recurs (a spark, a paper window, a red thread) and the role it plays in each section.
**Palette.** Ground, ink, two supporting colours, one accent. The accent belongs to: <one element or one moment>.
**Colour arc.** How the palette shifts across the song (cold verse → warm chorus → stripped bridge).
**Type voices.**
- Sung line: <font, weight, size>.
- Asides / labels: <mono or hand>.
- Title: <display>.
**Tone.** Three adjectives, and three things it is not.
**Will not contain.** Glowing brains, code rain, particle nebulae, lens flares, generic waveform bars, neon for its own sake, <...>.
**Chorus template.** The set and rules every chorus shares, and what escalates each time.
**Sections.** A paragraph per section: the visual idea (a pun, a transformation, a metaphor — not a literal drawing of the line), and how the lyric is integrated.
**Revisions.** A dated log of what changed and why.
```

## Storyboard table

One row per shot, grouped by section. Times come from `helios analyze` sections and downbeats; lyric anchors come from `lyrics.json`.

```markdown
| Section | Time | Lyric anchor | Shot: seen · EVENT · camera | Lyric treatment | Out |
|---|---|---|---|---|---|
| intro | 0.0–9.4 | — | motif alone on paper · it ignites · slow push | title writes on with the pen | match cut: flame → window |
| verse 1 | 9.4–19.0 | "we built a" | paper city · windows light on kicks · crane right | words stamped on sills | crane continues |
| verse 1 | 19.0–28.6 | "and carried it" | one window · figure carries the light · push in | words ride the light's path | zoom through window |
| chorus 1 | 28.6–47.8 | "every window" | night sky · windows rise and become stars · tilt up | each word becomes a star | iris on the moon |
```

Check before building:

- Every shot has an event (something changes between its first and last frame).
- Every shot has a camera move, even if slow.
- Every seam has a motivated transition in the Out column.
- Choruses share a template and escalate.
- No section illustrates its lyric literally.
- The ending rhymes with the opening.

## From storyboard to code

**Scenes as data, anchored to content.**

```js
const SCENES = [
  { id: 'intro',   start: 0,                      draw: intro },
  { id: 'verse1a', start: cut('we built a'),      draw: city,    params: { pass: 1 } },
  { id: 'verse1b', start: cut('and carried it'),  draw: window_, params: {} },
  { id: 'chorus1', start: cut('every window'),    draw: sky,     params: { n: 1 } },
  { id: 'chorus2', start: cut('every window', 1), draw: sky,     params: { n: 2 } },
];
SCENES.forEach((s, i) => (s.end = SCENES[i + 1]?.start ?? DURATION));
```

- `cut(phrase, nth)` returns the last beat at or before the phrase's first word. A short pickup (under two beats) before a downbeat belongs to the previous section: cut on the downbeat and let the pickup words appear over the end of the old scene.
- Scenes whose windows touch hard-cut. To crossfade, overlap them and draw both with alphas.
- Each scene is `draw(t, local, params)` where `local` runs 0→1 across the scene. It paints the whole frame.
- A chorus escalates through `params.n`: more elements, a bigger camera move, the accent appearing, the motif doing more.

**Words drive the scene, not just the subtitle.** `lyric('light').words[0]` gives a time the scene can grow, flash or transform on. A counter can step on every occurrence of a word.

**Beat-driven motion.** Use `pulse(t, B.onsets.kick)`, bar phase from `within(B.downbeats, t)`, and `B.sections[i].energy` to scale intensity. See the make-video music reference.

## Characters in a music video

If the video has characters, see the [cartoon-short skill](../../cartoon-short/SKILL.md): a rig you design, acted emotion changes, beat-locked idles and dances. In a music video:

- Characters react to the song and each other; they don't lip-sync.
- A dance is pose offsets from the beat phase. Two or three moves, mixed per section, are enough.
- Keep action out of the lyric band.

## Splitting scenes across agents

For a long song, scenes can be built in parallel. Give each agent the same brief:

```markdown
You own: scenes/<id>.js (and nothing else). Shared files (engine.js, lyrics.json, track.beats.json,
TREATMENT.md, STORYBOARD.md) are read-only; report bugs in them instead of fixing them.

Your scene: <id>, <start>–<end> (from the storyboard row). Signature: draw(t, local, params).
It paints the whole frame, is a pure function of t, uses only seeded randomness, and keeps lyric
text inside the lyric band and title-safe area.

Check your work:
  npx -y @helios-project/cli@latest sheet video.html --at <first>,<middle>,<last> --cols 3
  npx -y @helios-project/cli@latest sheet video.html --strip <a transition or a hit>
  npx -y @helios-project/cli@latest verify video.html --duration <end> --cues lyrics.json
Then LOOK at the PNGs. Performance budget: <N> ms per frame.
```

The lead agent owns the timeline, the seams between scenes and the final render.

## Optional: motion blur

For fast camera moves, average a few sub-frame renders inside `renderAt` (see the motion-styles skill's [time-tricks reference](../../../design/motion-styles/references/time-tricks.md)). Keep lyrics out of the blur: draw them once, at the frame's own time, on top.
