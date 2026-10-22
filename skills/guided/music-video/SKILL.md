---
name: guided-music-video
description: "Lyric and karaoke music videos drawn in code: get word- and syllable-level lyric timings (from a cue file, or by forced alignment on a vocal stem), write a treatment and a storyboard by song section, derive the edit from the lyrics and the beat map, and integrate the words into every scene instead of subtitling them. Renders one Helios renderAt(t) page with the song attached. Use for lyric videos, karaoke videos, visualizers with lyrics, and story-driven music videos."
---

# Music video

A music video where the words matter. The picture moves on the beat, the words light up on the voice, and every scene does something different with the lyric. It's one `window.renderAt(t)` page, so the [make-video](../../../plugins/helios/skills/make-video/SKILL.md) contract applies; its [music reference](../../../plugins/helios/skills/make-video/references/music.md) covers `helios analyze`, the beat map and the sync rules. This skill adds what a lyric video needs on top of that.

Start from [karaoke.html](karaoke.html) and [lyrics.example.json](lyrics.example.json): a tested page that reads word and syllable timings, lights each glyph as it's sung, looks lyrics up by content, and makes the scene react to a word.

## Ground rules

- **The motion syncs to the beat; the word syncs to the voice.** A word lights exactly at its sung start and is fully lit by its end. A line may appear dim up to about 0.4 s early. **The highlight never runs ahead of the voice.**
- **Never fake the timing.** A wipe whose speed is computed from the number of letters, or a beat grid from a guessed BPM, drifts off the song within seconds. Get real word times (step 1) and a real beat map (`helios analyze`).
- **Look lyrics up by content, never by hard-coded time.** `lyric('through the night').words[0].start`. Re-timing the lyrics then re-times the whole video.
- **Lyrics are usually copyrighted.** Use the user's own song and lyrics. Don't commit lyric text to public examples.

## 1. Get the timings

| Tier | When | How | Accuracy |
|---|---|---|---|
| 0 | The user has an `.srt`/`.lrc` with line times, or nothing but the text | Line times from the file (or from tapping along); split each line's span into words weighted by syllable count. Mark the file `"approx": true`. | Lines ±100 ms, words rough |
| 1 | Python is available | Separate the vocal (`demucs --two-stems=vocals`), then align the known lyrics to it with stable-ts or WhisperX | Words ±50–100 ms |
| 2 | The words must land on consonants | Forced alignment with torchaudio's MMS_FA on the vocal stem, plus onset refinement and a Whisper cross-check | Word starts ±30–50 ms |

Whatever the tier, **decode the song to WAV once** and use that same file for analysis, alignment and `--audio`. MP3 decoders disagree by 20–50 ms because of encoder delay, which is enough to make every word look late.

Convert the result to one `lyrics.json` that both the page and `helios verify --cues` read:

```json
{ "approx": false,
  "lines": [{ "text": "and carried it through the night", "start": 3.6, "end": 6.6, "first": 5, "last": 10 }],
  "words": [{ "w": "carried", "start": 3.9, "end": 4.5, "syl": [[3.9, 4.2], [4.2, 4.5]] }] }
```

See [references/lyrics.md](references/lyrics.md) for each tier's commands, the conversion script, and how to check timings without ears.

## 2. Treatment

Write `TREATMENT.md` before any code. One page:

- **Concept** in one paragraph, and **one motif** that recurs and changes role across the song.
- **Palette** with one accent owned by one moment or one element. **Type voices:** two or three, each with a job (the sung line, the typed aside, the title).
- **An anti-slop list:** what this video will not contain (glowing brains, code rain, particle nebulae, neon for its own sake, a stock "audio visualizer" bar row).
- **Visual ideas, not illustrations.** Puns, transformations and metaphors for each section. Never draw literally what each line says.
- **Chorus plan:** the chorus returns to the same set or template and escalates each time.
- **How the lyric lives in each scene:** riding a curve, typed as tokens, stamped on a form, engraved, written by a pen, unmasked block by block. Never the same plain subtitle bar all the way through.

## 3. Storyboard by section

Run `helios analyze song.wav` first, then storyboard against its `sections` and `downbeats`:

```
| Section  | Time        | Lyric (first words)     | Shot / what happens                         | Lyric treatment       | Out             |
| intro    | 0.0–9.4     | —                       | the motif alone, slow push                  | title writes on       | match cut       |
| verse 1  | 9.4–28.6    | "we built a…"           | city of paper windows lights one by one     | words stamped on sills | windows → stars |
| chorus 1 | 28.6–47.8   | "every window…"         | sky set; motif becomes a constellation      | words as star paths   | iris on the moon |
```

- **Something happens in every shot.** A camera move in every shot. Calm shots in low-energy passages.
- **Intensity follows the song:** roughly 40 % in the intro, 70 % in verses, 100 % in choruses.
- **Rotate shot types on the beat;** never the same pose or framing on adjacent cuts.
- **The Out column names a motivated transition** (a zoom through an eye, a shape that becomes the next scene, a cut on action). Keep brush wipes or plain cuts for section breaks.
- **No fake singing.** A mouth that flaps to the lyric reads as jitter. Characters react to the song; they don't lip-sync it.

See [references/treatment.md](references/treatment.md) for the full templates, scene reuse with parameters, and a brief for splitting scenes across several agents.

## 4. Build

Derive the edit from the data, not from typed-in seconds:

```js
// Cut on the last beat at or before a line's first word.
const cut = (phrase, nth = 0) => {
  const s = lyric(phrase, nth).words[0].start;
  return B.beats[lastAt(B.beats, s + 0.02)];
};
const SCENES = [
  { start: 0,                       draw: intro },
  { start: cut('we built a'),       draw: verse,  params: { n: 1 } },
  { start: cut('every window'),     draw: chorus, params: { n: 1 } },
  { start: cut('every window', 1),  draw: chorus, params: { n: 2 } },   // same scene, escalated
];
```

`lastAt` and the beat map come from the make-video music reference. One scene function serves every chorus through `params`, and each pass adds something.

Karaoke recipes are in [references/lyrics.md](references/lyrics.md#karaoke-recipes): the per-glyph wipe with kerning-safe positions, the done colour that snaps instead of blending, a small pop on each word start, held notes that stretch, line layout and safe areas, and pen-written lyrics. Every word drawn on a canvas must be declared with `window.heliosDrawnText?.add(word)`.

## 5. Check

```bash
npx -y @helios-project/cli@latest verify video.html --duration 156 --cues lyrics.json   # every word on screen at its time
npx -y @helios-project/cli@latest sheet video.html --strip 28.4:29.2 --fps 30           # every frame into the first chorus
npx -y @helios-project/cli@latest sheet video.html --at 9.4,28.6,47.8,67.0 --cols 4      # each section's first frame
```

- At every section start, is the new idea clear? Does each chorus escalate?
- In strips around a few words, does the highlight start on the frame the word starts, never before?
- Are lyrics inside title-safe margins (96 px or more at 1080p) and clear of anything busy behind them? Is contrast high enough to read?
- Did a word get swallowed by a transition? `verify --cues` names it.
- Is the tempo right? If cuts feel off by a steady fraction, the analysis may have locked to half, double or 2/3 time: re-run `analyze` with `--tempo-range`.

Render with the WAV:

```bash
npx -y @helios-project/cli@latest render video.html -o video.mp4 --duration 156 --audio song.wav --preset medium
npx -y @helios-project/cli@latest check video.mp4
```

## Credits

The alignment pipeline, karaoke rules and lyric-anchored timeline are adapted from [pdoom-video](https://github.com/mexicat/pdoom-video) by Giacomo Magnanini (MIT; its song and lyrics are not covered and nothing from them is used here). The section storyboard with a transition column draws on ideas from [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) by John Heibel. See [THIRD_PARTY.md](../../THIRD_PARTY.md).
