---
name: make-video
description: Make a video, MP4, GIF, animation, music video, short film, explainer, chart animation, product demo, logo reveal or social clip from code. Write one HTML page that draws any frame from its time t, render it frame-exact to MP4 with Helios, check stills and contact sheets, and add a soundtrack. Use whenever the user asks for a video or an animation file.
---

# Make a video with Helios

A Helios video is one HTML page with one function, `window.renderAt(t)`. It draws the frame at `t` seconds. The Helios renderer loads the page in headless Chrome, calls `renderAt(t)` once per frame, captures each frame and encodes the MP4. There is no bundler, no framework and no capture script to write.

## 1. Write the page

Every frame must be a **pure function of `t`**. The renderer may ask for frames in any order, and it renders the same frame identically every time.

- **Derive everything from `t`:** positions, opacity, which scene is showing. Never use counters, `x += speed`, physics stepped frame by frame, or `setTimeout`/`setInterval`.
- **Randomness must be seeded.** Use `rand(seed)` below, not a bare `Math.random()` inside `renderAt`.
- **Load assets before the first frame.** Keep a `ready` promise for fonts and images, and make `renderAt` async and `await ready`. The renderer waits for any promise that `renderAt` returns.
- **Size the page to the video.** A canvas the size of the video, with `html,body{margin:0;overflow:hidden}`.

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>html,body{margin:0;background:#0b0b10;overflow:hidden}</style>
</head>
<body>
<canvas id="c" width="1920" height="1080"></canvas>
<script>
const W = 1920, H = 1080;
const ctx = document.getElementById('c').getContext('2d');

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);              // easeOutCubic
const span = (t, start, dur) => clamp((t - start) / dur);         // 0→1 over [start, start+dur]
const rand = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };

const ready = document.fonts.ready;                               // plus any images you load

window.renderAt = async (t) => {
  await ready;
  ctx.fillStyle = '#0b0b10';
  ctx.fillRect(0, 0, W, H);

  // Scene 1 (0–3s): title rises in.
  const p = ease(span(t, 0.2, 1.2));
  ctx.globalAlpha = p;
  ctx.fillStyle = '#f5b700';
  ctx.font = '800 140px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Hello, video', W / 2, H / 2 + 60 * (1 - p));
  ctx.globalAlpha = 1;

  // Particles: a seeded position per particle, animated by t.
  for (let i = 0; i < 80; i++) {
    const x = (rand(i) * W + t * 60 * (0.5 + rand(i + 99))) % W;
    const y = rand(i + 7) * H;
    ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.35 * rand(i + 3)})`;
    ctx.fillRect(x, y, 3, 3);
  }
};
</script>
</body>
</html>
```

DOM, CSS, SVG and WebGL pages work too. Set styles from `t` inside `renderAt`, or let CSS animations and GSAP/motion timelines run. The renderer seeks those to each frame's time. See [references/pages.md](references/pages.md).

## 2. Render it

```bash
npx -y @helios-project/cli@latest render video.html -o video.mp4 --duration 12
```

| Flag | Use |
|---|---|
| `--duration <s>` | Length in seconds. Fractions are fine. Required for a `renderAt` page. |
| `--width 1080 --height 1920` | Frame size; the default is 1920×1080. Match your canvas. Vertical 9:16 is `1080x1920`. |
| `--fps <n>` | Frame rate; the default is 30. |
| `--audio song.mp3` | Soundtrack, trimmed to the video. |
| `--mode canvas` | Faster for a page that is only one full-frame `<canvas>`. The default, `dom`, captures the page as it looks. |
| `--preset medium` | For the final file. It's several times smaller at the same quality and takes longer to encode. The default, `ultrafast`, is quick for drafts. |

Rendering is frame-exact. Frame *n* is exactly `renderAt(n / fps)`, with no dropped or duplicated frames and no dependence on machine speed.

For a GIF, render the MP4 and then convert it. See [references/pages.md](references/pages.md#gif).

## 3. Look at the frames before you say it's done

Don't hand over a video you haven't looked at. Render stills and contact sheets from the page itself; they're fast and need no encode:

```bash
npx -y @helios-project/cli@latest still video.html --at 0.5,3,7.25            # full-size PNGs
npx -y @helios-project/cli@latest sheet video.html --every 1 --duration 12   # one labelled grid
npx -y @helios-project/cli@latest sheet video.html --strip 2:3 --fps 30      # every frame in 2–3s
npx -y @helios-project/cli@latest sheet video.html --at 4 --crop 600,300,720,480  # zoom into a region
```

Before a long render, check that the page really is a function of `t`:

```bash
npx -y @helios-project/cli@latest verify video.html --duration 12   # exits 1 and names the frames that depend on history
```

Open the PNGs with your image-viewing tool and check:
- text is legible and inside the frame
- transitions actually happen
- there are no empty or black frames
- the pacing matches the brief

Fix the page, check again, and render again.

## 4. Music and sound

`--audio` muxes an audio file. To sync visuals to the music, use one of these:
- **Known BPM:** beat `k` falls at `k * 60 / bpm` seconds. Drive pulses from `t` against that grid.
- **Unknown tempo:** analyse the audio in the page. Decode it once and precompute a loudness envelope, then read the envelope at `t` in `renderAt`. See [references/music.md](references/music.md).

## When something is wrong

| Symptom | Fix |
|---|---|
| "How long should the video be? Pass --duration" | Add `--duration <seconds>`. |
| `window.renderAt(2.5) threw: …` | Your page errored at that time. The message includes your stack trace. |
| The first render pauses to download Chromium | That's expected, and it happens once. Don't run `npx playwright install` yourself: it fetches a build for the wrong Playwright version. |
| "The page defines no window.helios, window.renderAt(t) …" | Your script never defined `renderAt`. Check the page for a load error, such as a syntax error or a failed import. |
| Frames differ between two renders, or `verify` fails | Something isn't a function of `t`: an unseeded `Math.random()`, a counter or a timer. |
| Blank WebGL frames | Draw inside `renderAt` (or a rAF loop), not once at load. |

Bigger projects (React/Vue components, studio editing, distributed cloud rendering) use the Helios packages directly: <https://github.com/BintzGavin/helios>.
