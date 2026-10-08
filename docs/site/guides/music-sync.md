---
title: "Time a Video to Music"
description: "Analyse a song, cut and move on its beats and hits, put lyrics on their sung times, and check the result"
---

# Time a Video to Music

A music video, a lyric video or a beat-synced promo works when every timed thing answers something you can hear. Helios gives you the song's structure as data, a component to read it at any time `t`, and checks that a script can run before you deliver.

## 1. Analyse the song

```bash
helios analyze song.mp3
# Wrote song.beats.json: 131.6 BPM (129.2–133.9), 412 beats, 103 bars, 14 hits, 5 sections
```

`song.beats.json` holds, in seconds of song time:

| Field | What it is |
|---|---|
| `beats`, `downbeats` | Every beat and every bar line, following the song's real tempo. Bar `k` starts at `downbeats[k]`. |
| `bpm`, `tempo` | The typical tempo, and the local tempo every 5 seconds |
| `onsets.kick`, `onsets.snare`, `onsets.hat` | Drum hits by frequency band |
| `hits` | The big moments, such as drops and impacts: `{ t, score }` |
| `risers` | Build-ups, `{ t0, t1 }`, ending where they land |
| `sections` | Parts of the song: `{ t0, t1, energy }` |
| `envelope` | Loudness per frame (`level`, `low`, `mid`, `high`, each 0–1) at `envelope.fps` |

Real songs drift in tempo. A grid laid from one BPM is a beat off within a minute, so `beats` lists every beat, each snapped to a real onset. If the analysis locks onto half or double time, pass `--tempo-range 120:140`.

## 2. Read it at time `t`

Install the beat clock into your project:

```bash
helios add beat-clock
```

```ts
import { loadBeats } from './components/helios/beatClock';

const beats = loadBeats('song.beats.json');

window.renderAt = async (t) => {
  const clock = await beats;
  const bar = clock.bar(t);                          // cut on downbeats: bar.index picks the shot
  const punch = 1 + 0.03 * clock.pulse(t, 'kick');   // a small camera punch on every kick
  const flash = clock.pulse(t, 'hit');               // save the big move for the hits
  // draw the frame from bar, punch and flash
};
```

Every answer is a pure function of `t`, so frames render the same in any order and on distributed workers. A single HTML page that doesn't use the registry can paste a twenty-line reader instead; the `make-video` skill's music reference has one. See [Beat Clock](/examples/beat-clock) for the full API.

## 3. Timing rules

- **The motion syncs to the beat; the word syncs to the voice.** A lyric or caption appears at its sung or spoken time, never snapped to the nearest beat.
- **Cuts land on downbeats, kicks or snares.** Change shots on bar lines, punch on kicks, ride a riser into the hit it lands on.
- **Moves answer sounds you can hear.** No shake in a drumless intro. Where the song breathes, hold still; a calm song wants longer shots.
- **An entrance that marks a beat takes at most an eighth of a beat.** A snap keyed early reads as early.
- **Flashes belong to an idea, on hits, and never more than three in a second.**

For product demos, the [cursor component](/examples/cursor) keys each click to the moment it lands, so clicks hit the beat too.

## 4. Lyrics and captions

Keep the timed text in a file (`.srt`, `.vtt`, or JSON words `{ "text", "start", "end" }`), draw each cue from it at its time, and check that every one made it on screen:

```bash
helios verify video.html --duration 182 --cues lyrics.srt
# 417/417 cues on screen at their time.
```

DOM and SVG text is found automatically. Text drawn on a canvas must be declared for the frame:

```js
const say = (text, x, y) => { ctx.fillText(text, x, y); window.heliosDrawnText?.add(text); };
```

What is shown can differ from what is sung (show "+25%" over "plus twenty-five percent"); put the displayed text in the cue file. If a word lands late, fix its time in the cue file, not in the page code.

## 5. Look, then check the file

Render contact sheets at the moments that should react, such as the first few hits or a run of downbeats, and look at them:

```bash
helios sheet video.html --at 10.72,21.4,32.1 --cols 3
helios sheet video.html --strip 10.5:11 --fps 30 --cols 8 --cell-width 240   # every frame around one hit
```

Render with the song, then check the file:

```bash
helios render video.html -o video.mp4 --duration 182 --audio song.mp3 --preset medium
helios check video.mp4
```

`helios check` fails a video with more than three flashes in any second (WCAG 2.3.1), and warns about missing colour tags or a frame count that doesn't match the duration.

## From an AI assistant

With the Helios MCP server, the `music_video` prompt walks an assistant through the same steps: `analyze_audio`, a page timed to its beats, `verify_video` with the lyric cues, frames at the hits, and `render_video`, which runs `helios check` when it finishes. See [Use Helios from Claude, ChatGPT and Codex](/guides/ai-assistants).
