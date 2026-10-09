---
title: "Beat Clock (Music Sync)"
description: "Cut, punch and pulse on the beats, bars, kicks and hits of a song"
---

# Beat Clock (Music Sync)

`helios analyze song.mp3` writes `song.beats.json`: the song's beats on a tempo that drifts, its downbeats, kick, snare and hat onsets, the big hits, sections and loudness envelopes. The `beat-clock` registry component reads that file and answers questions about it at any time `t`: which beat and bar it is, how long since the last kick, how loud the low end is.

Every answer is a pure function of `t`. Lookups are binary searches over lists sorted once, and nothing is remembered between frames, so frames render the same in any order and on distributed workers.

## Install

```bash
helios add beat-clock
```

This copies `beatClock.ts` into your components folder. It has no dependencies and works with or without `@helios-project/core`.

## Usage

On a page that draws its own frames with `window.renderAt(t)`:

```ts
import { loadBeats } from './components/helios/beatClock';

const beats = loadBeats('song.beats.json');
const shots = [drawCity, drawSea, drawSky];

window.renderAt = async (t) => {
  const clock = await beats;
  const bar = clock.bar(t);
  const shot = shots[Math.max(bar.index, 0) % shots.length];                 // cut on every downbeat
  const punch = 1 + 0.03 * clock.pulse(t, 'kick') * clock.level(t, 'low');   // punch on kicks
  ctx.setTransform(punch, 0, 0, punch, (W - W * punch) / 2, (H - H * punch) / 2);
  shot(ctx, t, bar.phase);
};
```

Render it with the song under it: `helios render page.html --audio song.mp3 --duration 30`.

With `@helios-project/core`, call the same methods with the composition time, for example inside `helios.subscribe((state) => draw(state.currentTime))`. If you already have the JSON, `createBeatClock(data)` makes a clock without fetching.

## API

| Call | Returns |
|---|---|
| `beat(t)` | `{ index, phase, length }`: the beat at or before `t` (-1 before the first), how far through it (0–1) and its length in seconds. Past the last beat the grid continues at the closing tempo. |
| `bar(t)` | `{ index, phase, beat }`: the bar (0 from the first downbeat, negative before it), how far through it (0–1, moving evenly per beat) and the beat within it. |
| `since(t, events)` / `next(t, events)` | Seconds since the latest event at or before `t`, or until the next one after it. `Infinity` when there is none. |
| `pulse(t, events, halfLife = 0.1)` | 1 on an event, halving every `halfLife` seconds after it. |
| `level(t, band = 'level')` | A loudness envelope (`'level'`, `'low'`, `'mid'` or `'high'`), 0–1, interpolated between its frames. |
| `hitsBetween(t0, t1)` | The hits after `t0` up to and including `t1`. `hitsBetween(t - 1 / fps, t)` gives the hits since the previous frame. |
| `section(t)` | The section `t` falls in (`{ index, t0, t1, energy }`), or `null`. |

`events` is `'beat'` (the default), `'downbeat'`, `'kick'`, `'snare'`, `'hat'` or `'hit'`, or your own sorted list of times. The sorted lists themselves are on the clock: `clock.beats`, `clock.downbeats`, `clock.kicks`, `clock.snares`, `clock.hats` and `clock.hits`.

`beat` and `bar` take an optional object to write into (`clock.beat(t, out)`), so a page can call them every frame without allocating.

## Timing tips

- Key motion to the beat grid and to the sounds you can hear: cuts on downbeats, a punch on kicks, a big move on a hit. Keep still where the song breathes.
- Put words at their own time, not snapped to a beat: the motion syncs to the beat, the word to the voice.
- An entrance that lands on a beat should take at most an eighth of a beat: `clock.beat(t).length / 8`.
