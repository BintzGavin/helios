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

## Syncing to the beat

**Known tempo.** If you know the BPM, beat `k` is at `k * 60 / bpm` seconds:

```js
const BPM = 120, BEAT = 60 / BPM;
const sinceBeat = (t) => t % BEAT;                 // seconds since the last beat
const pulse = (t) => Math.exp(-8 * sinceBeat(t));  // 1 on the beat, decaying to 0
const bar = (t) => Math.floor(t / (BEAT * 4));     // which bar we're in, for scene changes
```

**Unknown tempo: analyse the track in the page.** Decode the file once, turn it into a loudness value per frame, then read that value at `t`. The result is still a pure function of `t`, so it renders the same every time.

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

window.renderAt = async (t) => {
  await ready;
  const l = level(t);
  // e.g. scale a shape with l, flash on hit(t), change scene every 4 beats…
};
```

Helios serves the page's folder over http while it renders, so `fetch()` can read files next to the page. To preview in a normal browser, serve the folder too, for example with `npx serve`: a page opened straight from disk can't fetch other files.

## Checking sync

Render a sheet around a moment you know is loud (a drop or a big kick) to confirm that the visuals react on the right frame:

```bash
npx -y @helios-project/cli@latest sheet video.html --strip 7.5:8.5 --fps 30 --cols 8 --cell-width 240
```
