# Page patterns

The renderer calls `window.renderAt(t)` with `t` in seconds, awaits it if it returns a promise, and then captures the frame. `window.seek(t)` and `window.__render(t)` also work; `renderAt` wins if more than one is defined. Around that call, the renderer also:
- sets the page clock (`performance.now()`, `Date.now()`, `requestAnimationFrame` timestamps) to `t`;
- seeks every CSS/WAAPI animation to `t`.

## Scenes on a timeline

Keep a list of scenes with start and end times, and draw whichever ones are active. Each scene gets a local progress value from 0 to 1.

```js
const scenes = [
  { start: 0,  end: 4,  draw: title },
  { start: 3.5, end: 9, draw: chart },   // overlaps title for a crossfade
  { start: 8.5, end: 12, draw: outro },
];
window.renderAt = async (t) => {
  await ready;
  clear();
  for (const s of scenes) {
    if (t < s.start || t > s.end) continue;
    const local = (t - s.start) / (s.end - s.start);                  // 0→1 across the scene
    const fade = Math.min(1, (t - s.start) / 0.5, (s.end - t) / 0.5); // 0.5s fade in and out
    ctx.save(); ctx.globalAlpha = Math.max(0, fade); s.draw(local, t); ctx.restore();
  }
};
```

## DOM and CSS pages

Set styles from `t`. This is also the simplest way to use real HTML text, SVG and layout:

```js
const title = document.querySelector('#title');
window.renderAt = (t) => {
  const p = Math.min(1, t / 1.2);
  title.style.opacity = p;
  title.style.transform = `translateY(${(1 - p) * 40}px)`;
};
```

CSS `@keyframes`, the Web Animations API, and GSAP/motion timelines that are created at load also render correctly: the renderer seeks them to each frame's time. Render these pages in the default `dom` mode.

## Canvas, WebGL and three.js

- 2D canvas: draw everything inside `renderAt`, clearing first.
- WebGL/three.js: build the scene at load; in `renderAt`, set every animated property from `t`, then call `renderer.render(scene, camera)`. Don't rely on `clock.getDelta()`.
- A page that is only one full-frame canvas renders fastest with `--mode canvas`.

## Images and fonts

```js
const img = new Image(); img.src = 'photo.jpg';
const ready = Promise.all([img.decode(), document.fonts.load('800 120px Inter'), document.fonts.ready]);
window.renderAt = async (t) => { await ready; /* ... */ };
```

Put files next to the page and use relative paths. Helios serves the page's folder while it renders, so `fetch('data.csv')` works too.

## Vertical, square and other sizes

Make the canvas (or `body`) exactly the video size, and pass the same size to the CLI:

```bash
npx -y @helios-project/cli@latest render clip.html -o clip.mp4 --duration 10 --width 1080 --height 1920
```

## Seamless loops

Make the frame at `t = duration` equal to the frame at `t = 0`. Drive motion with `Math.sin(2 * Math.PI * t / duration)`, or with `(t / duration) % 1`.

## GIF

Render the MP4, then convert it with a two-pass palette. This requires ffmpeg:

```bash
ffmpeg -i loop.mp4 -vf "fps=20,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" loop.gif
```

## Previewing in a browser

Open the page and call `renderAt` from the console, or add a quick scrubber:

```html
<input id="scrub" type="range" min="0" max="12" step="0.01" style="position:fixed;bottom:8px;left:8px;width:50%">
<script>scrub.oninput = () => window.renderAt(+scrub.value);</script>
```

Remove the scrubber before rendering, or hide it: the default `dom` mode captures everything that is visible on the page.
