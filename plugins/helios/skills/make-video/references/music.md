# Music videos and sound

## Adding the soundtrack

```bash
npx -y @helios-project/cli@latest render video.html -o video.mp4 --duration 15 --audio track.mp3
```

The audio starts at 0 and is trimmed to the video's length.

Choose one way to add the audio:
- the `--audio` flag, or
- an `<audio src="track.mp3">` element in the page, which the renderer also mixes in.

Using both plays the track twice.

## Get the beat map

```bash
npx -y @helios-project/cli@latest analyze track.mp3      # writes track.beats.json
```

It prints the tempo, beat, bar and hit counts. The file holds, in seconds of song time:

| Field | What it is |
|---|---|
| `beats`, `downbeats` | Every beat and every bar line. They follow the track's real tempo, which drifts, and each beat sits on a real onset. Bar `k` starts at `downbeats[k]`. |
| `bpm`, `tempo` | The typical tempo, and the local tempo every 5 s |
| `onsets.kick`, `onsets.snare`, `onsets.hat` | Drum hits by band |
| `hits` | The big moments (drops, impacts): `{ t, score }` |
| `risers` | Build-ups: `{ t0, t1 }`, ending on the moment they land |
| `sections` | Parts of the song: `{ t0, t1, energy }` |
| `envelope` | Loudness per frame at `envelope.fps`: `level`, `low`, `mid`, `high`, each 0–1 |

Don't derive beats from one BPM unless the track is a click track you made: real songs drift, and a fixed grid is a beat off within a minute. Use `--tempo-range 120:140` if the analysis locks onto half or double time.

## Reading it in the page

```js
let B;                                                       // the beat map
const ready = fetch('track.beats.json').then((r) => r.json())
  .then((b) => { B = b; B.hitTimes = b.hits.map((h) => h.t); });

// Index of the last time in a sorted list at or before t (-1 if none).
const lastAt = (list, t) => {
  let lo = 0, hi = list.length - 1, i = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m] <= t) { i = m; lo = m + 1; } else hi = m - 1; }
  return i;
};
// Where t sits in its beat (or bar): index, and phase 0→1.
const within = (list, t) => {
  const i = lastAt(list, t);
  if (i < 0) return { index: -1, phase: 0 };
  const a = list[i];
  const step = i + 1 < list.length ? list[i + 1] - a : a - (list[i - 1] ?? a - 60 / B.bpm); // past the end: repeat the last step
  return { index: i, phase: Math.min(1, (t - a) / step) };
};
// 1 on each event in the list, decaying after it.
const pulse = (t, list, decay = 8) => { const i = lastAt(list, t); return i < 0 ? 0 : Math.exp(-decay * (t - list[i])); };
// Envelope value at t, interpolated between frames.
const level = (t, band = 'level') => {
  const e = B.envelope[band], x = Math.max(0, t * B.envelope.fps), i = Math.floor(x);
  return i + 1 < e.length ? e[i] + (e[i + 1] - e[i]) * (x - i) : e[e.length - 1] ?? 0;
};

window.renderAt = async (t) => {
  await ready;
  const bar = within(B.downbeats, t);           // scene = bar.index, cut on each downbeat
  const punch = 1 + 0.02 * pulse(t, B.onsets.kick, 12);
  const flash = pulse(t, B.hitTimes, 6);
  // e.g. ctx.setTransform(punch, 0, 0, punch, …); brighten on flash; scale bars with level(t, 'low')
};
```

The beat map is data loaded before the first frame, so every frame is still a pure function of `t`. Projects that use the Helios packages can install the same helpers as a component: `npx -y @helios-project/cli@latest add beat-clock`.

## Timing rules

- **The motion syncs to the beat; the word syncs to the voice.** Put a lyric or caption on screen at its sung or spoken time, not at the nearest beat.
- **Cuts land on downbeats, kicks or snares.** Change scenes on bar lines; punch the camera on kicks; ride a riser into the hit it lands on; save the big move for `hits`.
- **Hold still where the music breathes.** No shake in a drumless intro; let a calm song have long shots.
- **Flashes only on hits, never more than three a second.** `helios check video.mp4` fails anything above the WCAG 2.3.1 limit.

## Lyrics and captions

Keep the timed text in a file: `.srt`, `.vtt`, or JSON (`[{ "text": "ladies", "start": 9.32, "end": 9.64 }]`). Draw each cue from that file at its time, and check that every one made it on screen:

```bash
npx -y @helios-project/cli@latest verify video.html --cues lyrics.srt   # "417/417 cues on screen at their time."
```

What is shown can differ from what is sung: show "+25%" over "plus twenty-five percent". Put the displayed text in the cue file. Text drawn on a canvas must be declared with `window.heliosDrawnText?.add(text)` (see [pages.md](pages.md#text-the-checker-can-see)).

## Without the CLI: analyse the track in the page

If you can't run `helios analyze`, decode the file once in the page and turn it into a loudness value per frame:

```js
const FPS = 30;
let env = [];

async function loudness(url) {
  const bytes = await (await fetch(url)).arrayBuffer();   // Helios serves the page's folder, so fetch() works
  const audio = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes);
  const samples = audio.getChannelData(0);
  const hop = Math.floor(audio.sampleRate / FPS);
  const out = [];
  for (let i = 0; i < samples.length; i += hop) {
    let sum = 0;
    const end = Math.min(i + hop, samples.length);
    for (let j = i; j < end; j++) sum += samples[j] * samples[j];
    out.push(Math.sqrt(sum / (end - i)));
  }
  const max = Math.max(...out) || 1;
  return out.map((v) => v / max);                            // 0..1 per frame
}

const ready = loudness('track.mp3').then((e) => { env = e; });
const level = (t) => env[Math.min(env.length - 1, Math.max(0, Math.floor(t * FPS)))] || 0;
const hit = (t) => Math.max(0, level(t) - level(t - 1 / FPS)) * 4; // jumps in loudness: kicks and onsets
```

Helios serves the page's folder over http while it renders, so `fetch()` can read files next to the page. To preview in a normal browser, serve the folder too, for example with `npx serve`: a page opened straight from disk can't fetch other files.

## Checking sync

Render a sheet at the moments that should react, taken from the beat map (the first few `hits`, or a run of downbeats):

```bash
npx -y @helios-project/cli@latest sheet video.html --at 10.72,21.4,32.1 --cols 3
npx -y @helios-project/cli@latest sheet video.html --strip 10.5:11 --fps 30 --cols 8 --cell-width 240   # every frame around a hit
```

Then check the final file:

```bash
npx -y @helios-project/cli@latest check video.mp4     # flashing (WCAG 2.3.1) and colour tags
```
