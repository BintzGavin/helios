# Helios Examples

Minimal, single-purpose examples showing how to wire Helios up to a given framework,
animation library, or renderer.

**These are integration references, not design references.** Each one is deliberately
slim — enough to show the wiring and nothing more. Do not copy them as a starting point
for the *look* of a video: they are barely styled, and they are not kept current with
Helios' visual capabilities. To author a real composition, follow the guided skills in
`.agents/skills/helios-skills/` and the API contract in `llms.txt`.

Larger, opinionated video examples were removed from this directory on 2026-07-31,
precisely because they were being treated as a template to imitate.

## Core / vanilla JS

- **[simple-animation](./simple-animation/)** — basic DOM animation driven by CSS.
- **[simple-canvas-animation](./simple-canvas-animation/)** — basic Canvas 2D animation.
- **[waapi-animation](./waapi-animation/)** — Web Animations API integration.
- **[web-component-animation](./web-component-animation/)** — Helios inside a Shadow DOM web component.
- **[client-export-api](./client-export-api/)** — programmatic client-side export via `ClientSideExporter`.
- **[dom-benchmark](./dom-benchmark/)** — minimal DOM-mode render benchmark.

## Frameworks

- **[react-dom-animation](./react-dom-animation/)** — React + DOM.
- **[vue-dom-animation](./vue-dom-animation/)** — Vue + DOM.
- **[svelte-dom-animation](./svelte-dom-animation/)** — Svelte + DOM.

## Animation libraries

- **[gsap-animation](./gsap-animation/)** — GSAP timelines.
- **[framer-motion-animation](./framer-motion-animation/)** — Framer Motion.
- **[lottie-animation](./lottie-animation/)** — Lottie playback.

## Graphics and data

- **[threejs-canvas-animation](./threejs-canvas-animation/)** — Three.js on Canvas.
- **[pixi-canvas-animation](./pixi-canvas-animation/)** — Pixi.js on Canvas.
- **[d3-animation](./d3-animation/)** — D3 data-driven animation.

## Audio

- **[audio-visualization](./audio-visualization/)** — audio track analysis and visualization.

## Infrastructure

- **[distributed-rendering](./distributed-rendering/)** — splitting a render across workers,
  including a Cloudflare Workflow adapter.

## Running an example

Most examples are Vite projects, served from the repo root:

```bash
npx vite serve examples/<name>
```

Compositions must be served over HTTP, never opened as `file://` — an ES module import
from a `file://` origin is blocked by CORS, which leaves `window.helios` undefined and
produces a render that can look correct while the engine is not actually driving it.
