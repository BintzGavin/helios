# RFC: In-view MP4 export (spike result)

**Status: spike complete on `spike/in-view-export` (bcbfa29e) · shipped on `feat/in-view-export` · 5 October 2026**

The spike's code stays on its branch; [Production design](#production-design) describes what shipped.

This answers the three questions that [`2026-10-01-ai-host-distribution.md`](2026-10-01-ai-host-distribution.md) ("Render placements") set for in-view export: can the `ui://helios/player` view export a frame-exact MP4 in the person's own browser, inside the host's sandboxed iframe, with no Helios account and no Helios compute?

## Verdicts

| Question | Verdict | One line |
| --- | --- | --- |
| 1. Is it frame-exact? | **Canvas: go. DOM: works with caveats.** | Canvas captures are bit-identical to `helios still`. The stock DOM path fails on the first frame in current Chromium; with three fixes, DOM frames land at 42–52 dB PSNR from `helios still`. |
| 2. How does the file leave the sandbox? | **Conditional.** | `<a download>` is blocked. `ui/download-file` works, but only where the host advertises it, and stock basic-host doesn't. An app-only `save_export` tool works for local servers. |
| 3. Is it fast enough? | **Go.** | At 1080p, export took 0.16–0.27 s per second of video for canvas and GSAP pages, and 0.37–0.88 s for a DOM page with a web font. `helios render` took 0.75–1.21 s on the same pages. |

So "preview, edit and export without signing up" is real where the host advertises `ui/download-file`, or where `helios mcp` runs locally. On a web host that offers neither, the bytes can be made but not handed over. That host needs the hosted upload tool, which this spike didn't build.

## Method

**Prototype.** All spike code is in `tests/spikes/in-view-export/`. Production code is unchanged: `packages/cli/src/mcp/view/player.html`, `packages/cli/src/mcp/server.ts` and `packages/player` are read, never edited.

- `build.mjs` writes `out/player-export.html`. This is the production view plus an **Export MP4** button: a spike-only build.
- `src/page-exporter.ts` is bundled to a 237 KB IIFE, mostly mediabunny. On export the view injects it into the page's own `srcdoc` realm. It runs the player's `ClientSideExporter` with a controller that seeks through the renderer's page shim (`window.__helios_seek`), so export and preview share one "frame at t". It runs in the page realm because `dom-capture` uses `instanceof HTMLImageElement` and similar checks, which are false across realms.
- The exporter delivers with `<a download>`. The spike replaces that on the instance and keeps the bytes.
- `server.mjs` serves `helios mcp` (built `createHeliosMcpServer`) over streamable HTTP for basic-host. It adds the prototype `save_export` tool and an optional `connectDomains` for Google Fonts (`--connect fonts`).

**Host.** The ext-apps `basic-host` example, version 2.0.3 (`82221c0`), was copied out of the repository and run with `bun serve.ts`. Its double iframe uses a separate origin for the sandbox proxy, `sandbox="allow-scripts allow-same-origin allow-forms"` (no `allow-downloads`), and a CSP header with `frame-src 'none'` and `connect-src 'self'` plus any `connectDomains`. `basic-host-download-file.patch` is a 20-line change that advertises `downloadFile` and saves the file from the host page.

**Pages** (`pages/`, 5 s at 30 fps). The examples in `examples/` need a Vite build and `@helios-project/core`, so the spike uses three self-contained pages in the shape agents write, each with `window.renderAt(t)`:

- `canvas.html`: a 2D canvas with particles, shapes, an arc and text.
- `dom-font.html`: Google Fonts Playfair Display and Inter, CSS `@keyframes` (the shim seeks them as WAAPI animations), and a counter updated in `renderAt`.
- `gsap.html`: GSAP 3.12.5 from cdnjs, with a paused timeline seeked in `renderAt`, an SVG stroke and a `stagger`.

**Measures.**

- `measure.mjs` drives basic-host with Playwright: it calls `preview_video`, clicks through to the view, exports, and saves through `save_export`.
- Accuracy is compared at t = 0.4, 1, 1.7, 2.6 and 4.2 s (frames 12, 30, 51, 78 and 126) against `helios still --width 1920 --height 1080`, using ffmpeg's `psnr` and `ssim` filters on RGB24 PNGs. Two numbers per frame:
  - **captured**: the pixels handed to the encoder;
  - **encoded**: that frame extracted from the MP4.
- Timing uses the view's clock, because the shim virtualizes `performance.now()` in the page. "s/s" means wall seconds per second of video.
- Baseline: `helios render` at 1080p with the default preset (`ultrafast`). Its time includes launching the browser.
- Delivery and payload tests are in `delivery.mjs`, 60 s exports in `long.mjs`, codec support in `webcodecs-check.mjs`, and canvas taint in `taint-check.mjs`. Raw outputs are in `tests/spikes/in-view-export/results/`.

**Machine.** Apple M3 Pro, 18 GB. Browsers:

- Playwright 1.60 `chromium-headless-shell` 148.0.7778.96, the default for `headless: true` and for `helios still` and `render`;
- Playwright Chromium 148 in new headless mode (`channel: 'chromium'`);
- Google Chrome 154 for the codec probe.

To rerun:

```bash
npm ci && npm run build && npm run build -w packages/infrastructure
node tests/spikes/in-view-export/build.mjs
node tests/spikes/in-view-export/server.mjs --connect fonts        # or --connect none
# in a copy of ext-apps/examples/basic-host: npm install, vite build (INPUT=index.html, then sandbox.html),
#   SERVERS='["http://localhost:3001/mcp"]' bun serve.ts
node tests/spikes/in-view-export/measure.mjs --csp fonts --skip-baseline
node tests/spikes/in-view-export/delivery.mjs --phase stock     # --phase patched with the patched host
```

## Results

### WebCodecs in headless Chromium

| Browser | H.264 encode (1080p High) | Hardware H.264 | AAC encode | Opus encode |
| --- | --- | --- | --- | --- |
| chromium-headless-shell 148 | yes | no (software only) | yes | yes |
| Chromium 148, new headless | yes | yes | yes | yes |
| Chrome 154, new headless | yes | yes | yes | yes |

WebCodecs needs a secure context, so the probe ran on `http://localhost`. On `about:blank`, `VideoEncoder` is undefined.

### Q1: frame accuracy at 1080p, PSNR in dB / SSIM

Measured in chromium-headless-shell, the same build `helios still` uses.

| Page and path | Captured, 5 frames | Encoded, 5 frames | `helios render`, same frames |
| --- | --- | --- | --- |
| canvas | inf / 1.0000 for all five | 41.5–43.8 / 0.989–0.993 | 41.1–44.2 / 0.988–0.992 |
| gsap (DOM, untainted capture) | 42.3–70.5 / 0.9986–1.0000 | 39.1–49.4 / 0.992–0.9998 | 38.6–48.6 / 0.985–0.9994 |
| dom-font, stock `captureDomToBitmap` | fails on frame 0 | — | 42.3–45.9 / 0.992–0.994 |
| dom-font, untainted, fonts blocked by default CSP | 15.4–21.6 / 0.927–0.962 | 15.4–21.6 | |
| dom-font, + Google Fonts in `connectDomains`, inlined | 15.6–22.4 / 0.931–0.966 | 15.5–22.3 | |
| dom-font, + animations baked | **42.7–52.4 / 0.9982–0.9988** | **39.8–45.0 / 0.9931–0.9945** | |

- All in-view MP4s have 150 frames at 30/1 and last 5.000 s (ffprobe). They use H.264 High; `helios render` uses Constrained Baseline.
- In new-headless Chromium, which rasterizes on the GPU, canvas captures are 49.4–51.0 dB from `helios still` rather than identical. That is a rasterizer difference between browser builds, not a seek difference.

The stock DOM path has four defects, all in `packages/player/src/features/dom-capture.ts`:

1. **Tainted frames.** Chromium 148 and Chrome 154 taint an image of an SVG with a `foreignObject` that loads from a `blob:` URL, so `new VideoFrame(...)` throws "can't be created from tainted sources". An `ImageBitmap` made from it is tainted even when the image loads from a `data:` URL. The only clean path the probe found: load from a `data:` URL, `drawImage` the `<img>` onto a canvas, and make the frame from that canvas (`taint-check.jsonl`).
2. **Invalid XML.** `getExternalStyles` writes `<style>/* <href> */…`, and a Google Fonts href contains `&`. That makes the SVG invalid XML, so the image never loads and every frame fails. Once Google Fonts are reachable, this happens on every DOM page that uses them.
3. **Lost animations.** The serialized clone has no animation timeline. CSS animations restart at 0 inside the SVG image, and WAAPI animations disappear. Titles and bars that fade or scale in are missing from every frame (15–22 dB). The spike's "bake" fixes this: per frame, it writes each animated property's computed value inline and sets `animation: none` on those elements for the duration of the clone. Then it calls `__helios_invalidate_cache()` so the shim rescans the recreated CSS animations.
4. **Fonts.** Font files reach the SVG only as `data:` URIs, and getting them needs `fetch`. Under the default CSP (`connect-src 'self'`) the fetch is blocked and text falls back to another font, which also shifts the layout. With `https://fonts.googleapis.com` and `https://fonts.gstatic.com` in `connectDomains`, one inlining pass before export fixes it. The exporter otherwise re-fetches the stylesheet on every frame.

Smaller findings:

- `ClientSideExporter` never closes its `VideoSample`s, and mediabunny warns that they were garbage-collected without being closed.
- The default bitrate is a fixed 5 Mbps.

### Q2: leaving the sandbox

| Route | Result in basic-host 2.0.3 |
| --- | --- |
| `<a download>` from the view (what `ClientSideExporter` does) | **Blocked.** 0 downloads. The same click from the host page (control) produced 1. |
| `ui/download-file`, stock host | **Not advertised.** `hostCapabilities` has no `downloadFile`; the request fails with -32601 "Method not found". |
| `ui/download-file`, patched host | **Works.** The 3.04 MB export arrived intact in 30 ms. 25 MB synthetic: 255 ms; 100 MB: 973 ms. Each was one `postMessage` of base64. |
| `save_export` (app-only tool on `helios mcp`) | **Works.** 3, 25 and 100 MB uploads saved byte-identical. Out-of-order chunks, non-MP4 bytes and `../` names were refused. |
| Hosted upload tool returning a link | **Not built.** This repository has no hosted plugin server. Design below. |

`save_export` throughput, base64 chunks through the host's `tools/call` proxy and streamable HTTP:

| Payload | 256 KB chunks | 1 MB chunks | 4 MB chunks | 6 MB chunks |
| --- | --- | --- | --- | --- |
| 3 MB | 0.11 s (12 calls) | 0.07 s (3) | 0.06 s (1) | 0.15 s (1) |
| 25 MB | 0.75 s (100) | 0.63 s (25) | 0.52 s (7) | 0.54 s (5) |
| 100 MB | 3.45 s (400) | 2.26 s (100) | 2.23 s (25) | 2.60 s (17) |

- One 1 MB chunk is 1.40 M characters of arguments.
- basic-host's proxy and the spike's HTTP handler, which sets no body limit, passed 8.39 M-character arguments. The spike's own 8 M-character schema cap refused the next size up.
- Claude's and ChatGPT's limits on arguments of view-initiated `tools/call` are unknown. Claude's roughly 150k-character cap applies to tool results, and `save_export` returns about 100 characters, so it doesn't bind.
- 1 MB chunks were as fast as 4 MB chunks (2.26 s against 2.23 s for 100 MB), while 256 KB chunks added 1.2 s per 100 MB. That makes 1 MB a safe default.

### Q3: speed and size

Export seconds per second of video. Each in-view cell has two runs; the baseline has one.

| Page | 720p, headless shell | 1080p, headless shell | 1080p, new headless | `helios render` 1080p |
| --- | --- | --- | --- | --- |
| canvas | 0.10, 0.10 | 0.22, 0.27 | 0.18, 0.16 | 1.21 |
| gsap | 0.12, 0.12 (fonts run 0.12, 0.17) | 0.19, 0.18 | 0.16, 0.16 | 0.75 |
| dom-font, fonts blocked | 0.23, 0.23 | 0.42, 0.37 | — | 0.91 |
| dom-font, fonts inlined and baked | 0.68, 0.68 | 0.88, 0.78 | 0.67, 0.65 | 0.91 |

- With fonts inlined, DOM capture dominates the time: 3.7–4.0 s of a 3.9–4.4 s export. Each frame re-serializes the inlined Google Fonts CSS into the SVG: 646 KB, holding 11 font files, most of them `unicode-range` subsets the page never uses.
- Seeking takes 0.01–0.05 s per 150 frames. In the headless shell, encoding plus muxing takes 0.02–0.47 s.
- The baseline includes launching Chromium.

File size at 1080p for 5 s:

| Page | In view, 5 Mbps H.264 High | `helios render`, x264 ultrafast |
| --- | --- | --- |
| canvas | 3.04 MB | 3.87 MB |
| gsap | 1.39 MB | 1.56 MB |
| dom-font | 0.84 MB | 1.08 MB |

Exports of 60 s at 1080p, in headless shell (`long.mjs`):

| Page | Export | s/s | Size | `save_export` | Peak JS heap, host and view process |
| --- | --- | --- | --- | --- | --- |
| canvas | 12.0 s | 0.20 | 37.3 MB | 0.80 s | 108 MB |
| gsap | 12.7 s | 0.21 | 3.0 MB | 0.09 s | 36 MB |
| dom-font | 48.6 s | 0.81 | 4.2 MB | 0.13 s | 123 MB |

## Decisions

1. **Frame-exact: go for canvas pages; go with caveats for DOM pages.** Ship DOM export only with the four `dom-capture` fixes. Even then, DOM export is "matches the preview", not "matches `helios render` pixel for pixel". `foreignObject` can't show iframes, cross-origin images it can't fetch, `::before` and `::after` animations (bake skips pseudo-elements), or styles set on the `html` element. The view should keep **Render MP4** as the exact path wherever a local server exists.
2. **Leaving the sandbox: conditional.**
   - Use `ui/download-file` when the host advertises it.
   - Use `save_export` when the server is local.
   - Otherwise use a hosted upload link; until that exists, don't offer export.
   - Never rely on `<a download>`.
3. **Speed: go.** Every measured case beat real time and beat `helios render` on the same machine. Optimize DOM capture before it matters: cache the serialized `<style>` text across frames, and inline only the font subsets the page uses.

## Recommended production design

- **Player (`packages/player`, client-side export robustness):**
  - load the SVG from a `data:` URL and rasterize it through a canvas;
  - escape or drop the href comment;
  - bake animated styles per frame;
  - inline stylesheets and images once per export and reuse them across frames;
  - close each `VideoSample`;
  - give `ClientSideExporter.export` a delivery option that returns a `Blob` instead of clicking a link;
  - accept a controller that seeks through `__helios_seek`, so the view needs no `window.helios`.
- **View (`ui://helios/player`):**
  - add an Export MP4 button next to Render MP4;
  - inject the exporter into the page realm on first use, so playback doesn't pay its 237 KB;
  - pick delivery in this order: `ui/download-file`, then `save_export`, then the hosted link;
  - hide the button when none is available;
  - report progress, and allow cancelling through the exporter's `signal`.
- **Server (`helios mcp`):**
  - add `save_export` as an app-only tool, as prototyped: base64 chunks of 1 MB or less, an `uploadId` with ordered indices, a 256 MB cap, an MP4 signature check, writes under `exports/` inside the root, and the same path checks as other tools;
  - add a timeout that drops abandoned uploads, which the prototype keeps in memory forever;
  - for DOM pages, either add Google Fonts to `connectDomains`, or inline web fonts in `read_page` on the server, which keeps `connect-src` closed;
  - neither path adds compute.
- **Hosted endpoint (later, storage only):**
  - an app-only `upload_export` with the same chunk contract, which stores the file and returns a short-lived link;
  - the view then opens it with `ui/open-link`.
  - This is storage, not rendering. It still means Helios holds user files, which the 1 October RFC ties to Phase 4 accounts.

## Production design

What shipped on `feat/in-view-export`. Where it differs from the recommendation above, it says so.

### Player (`packages/player`)

- `features/dom-capture.ts`, the four capture fixes:
  - **Untainted frames.** The SVG loads from a `data:` URL, is drawn onto a canvas of the target size, and the `ImageBitmap` comes from that canvas. This is the spike's path, built into `captureDomToBitmap` rather than patched around it, so the player's own DOM export and the bridge get it too.
  - **Valid XML.** The href comment is XML-escaped, with `*/` neutralized. Every stylesheet, linked or inline, is written as escaped XML text, so CSS containing `&` or `<` can't break the SVG either.
  - **Animations frozen at t.** For each animation in `document.getAnimations()`, the computed values of its animated properties are written inline on the clone, and a rule inside the SVG switches every animation and transition off. Unlike the spike's bake, the live page is only read, so the shim needs no cache invalidation. Pseudo-element animations still can't be frozen.
  - **Fonts as `data:` URIs.** Linked and `@import`ed stylesheets are fetched, and their `url()`s (fonts, images) are inlined, resolved against the stylesheet that names them. An `@import` becomes the imported text, wrapped in `@media` when it has a media query; `layer()` and `supports()` imports are left in place. An optional `cache` reuses each fetch for every frame of an export. A failed fetch is not cached, so the next frame retries it.
- `features/exporter.ts`: each `VideoSample` and `AudioSample` is closed once added, even when the encoder rejects it. `export()` resolves with the file as a `Blob` (`undefined` when aborted), and `download: false` skips the `<a download>` click.
- `features/page-exporter.ts` (new): `exportPage(window, { fps, duration, width, height, signal, onProgress })` drives `ClientSideExporter` with a controller that seeks through `window.__helios_seek` and stamps each frame with its time.
  - The frame count is `round(duration × fps)`, passed as a playback range so it is always whole.
  - Mode: `canvas` when the page is one `<canvas>` covering at least 95% of the frame with no other element or text; `dom` otherwise.
  - One fetch cache per export.
  - `features/page-exporter-entry.ts` installs it as `window.__helios_export`.

### View (`ui://helios/player`)

- **Build.** `packages/cli/scripts/copy-view.js` bundles `page-exporter-entry.ts` with Vite into one minified IIFE, mediabunny included, and writes it into the view as a string literal. The built view is 282 KB. The exporter runs only when the person clicks Export MP4, which injects it into the page's `srcdoc` frame. The unbuilt source view has no bundle and hides the button.
- **Export MP4** sits next to Render MP4. It exports at the page's declared size and fps, for the length the player shows (10 s when the page declares none, as the player already says). Progress and Cancel use the render panel. While an export runs, the exporter owns the page's time: playback controls, Render MP4 and Export MP4 are disabled.
- **Delivery**, in order:
  1. The host advertises `downloadFile`: `ui/download-file` with one embedded resource, `file:///<page>.mp4`, in base64.
  2. Otherwise, `save_export` in 1 MB base64 chunks. The panel shows the saved file's absolute path, with Show in Finder and Open.
  3. The server has no `save_export`, so the first chunk gets "tool not found": the view says "This host can't receive files from the player, so the MP4 is being made with Render MP4 instead." and starts Render MP4. Later clicks go straight to Render MP4. A browser without `VideoEncoder` gets the same fallback.
- An export over 200 MB is not sent to `save_export`; the view says so and points to Render MP4.
- This differs from the recommendation: the button is never hidden. When the file can't leave the sandbox, the existing render path takes over. The view never uses `<a download>`.

### Server (`helios mcp`)

- `_meta.ui.csp.connectDomains` lists the same five origins as `resourceDomains`: cdnjs, jsDelivr, unpkg, and Google Fonts' stylesheets and font files. The exporter can then fetch what the page loads. Server-side font inlining in `read_page` was not built.
- `save_export`, in `packages/cli/src/mcp/exports.ts`, is app-only (`ui.visibility: ["app"]`, `"openai/visibility": "private"`), like `read_page`:
  - Arguments: `name`, `uploadId` (8–64 of `A–Z a–z 0–9 - _`), `index`, `total`, and `data`, base64 of at most 1 MB.
  - The name is a bare `.mp4` file name: no `/`, `\` or `..`, no control or Windows-reserved characters, not hidden, at most 200 characters.
  - The first chunk must start with an `ftyp` box.
  - Chunks arrive in order. A repeat of the last chunk with the same bytes is acknowledged as a retry; any other out-of-order chunk drops the upload.
  - The cap is 200 MB; the spike prototyped 256 MB.
  - Chunks stay in memory until the last one arrives. At most 256 MB and 4 uploads are held at once; making room drops the least recently active upload. An upload with no chunk for 10 minutes is dropped.
  - The file goes to `exports/<name>` inside the project root, through the same path checks as the other tools, so a symlinked `exports` that leads outside is refused. It is written to a `.part` file and renamed. An earlier export with the same name is replaced.
  - The last chunk returns `path` and `absolutePath`.

### Verification

- **Unit tests.** Player: each capture fix, the fetch cache, sample closing, the `Blob` return, and the page exporter's seeking, timestamps, mode choice and validation. CLI: every `save_export` rule, the tool listing and the CSP metadata.
- **View end to end** (`packages/cli/src/mcp/view/__tests__/player.export.test.ts`). It runs the built view, the real seek shim and the real server in a fake host whose CSP is built from the view's `_meta.ui.csp`, as basic-host builds it.
  - A 320×180 canvas page exports through `save_export`. Every sampled frame's color is within 4 of the page's at that time.
  - A DOM page with a routed Google Font and a CSS animation exports through a host that advertises `downloadFile`. Frame 30 is 40 dB from a screenshot of the page at t = 1 s. With `connectDomains` taken out of the CSP, the same check measured 13 dB, because the text fell back to another font.
  - The Render MP4 fallback, and cancelling.
- **Acceptance at 1080p.** The spike's `canvas.html` and `dom-font.html`, 5 s at 30 fps, with real Google Fonts, in the headless shell on the same M3 Pro. Export time runs from the click to the saved file. PSNR is against a screenshot of the page seeked with the shim, so it compares with the "Encoded" column above.

| Page | Delivery | Export | Size | Frames | PSNR in dB, frames 12 / 30 / 51 / 78 / 126 |
| --- | --- | --- | --- | --- | --- |
| canvas | `save_export`, 3 calls | 1.2 s | 3.04 MB | 150 | 40.2 / 38.9 / 39.4 / 39.7 / 39.2 |
| canvas | `ui/download-file` | 1.1 s | 3.04 MB | 150 | the same |
| dom-font | `save_export`, 1 call | 4.0 s | 0.84 MB | 150 | 40.6 / 40.5 / 40.2 / 38.5 / 37.9 |
| dom-font | `ui/download-file` | 3.8 s | 0.84 MB | 150 | the same |

### Not built

- The hosted `upload_export` tool and its link.
- Page audio in the export: the controller reports no audio tracks.
- A streaming target. The whole MP4 is still held in memory, and the bitrate is still a fixed 5 Mbps.
- Inlining only the font subsets a page uses.
- Checking whether Claude and ChatGPT advertise `downloadFile`, and their argument limits for `tools/call`.

## Remaining risks

- **Host support.** This spike didn't check whether Claude (web, desktop, mobile) or ChatGPT advertise `downloadFile`, or what argument size their `tools/call` proxies accept. These two facts decide question 2 on each host. Each host's CSP may also differ from basic-host's: the spike needs inline scripts, and `data:` and `blob:` in `img-src`.
- **Memory.** The exporter holds the whole MP4 in an `ArrayBuffer` (mediabunny `BufferTarget`), and delivery makes base64 copies on top. 60 s at 1080p is 37 MB at 5 Mbps; 10 minutes would be about 375 MB before copies. Long videos need a streaming target with chunked delivery, or a duration cap.
- **Long and heavy pages.** DOM export cost grows with font and CSS size, and it ran at 0.8 s/s on an M3 Pro. Slower laptops and phones were not measured.
- **Audio.** Untested in view. The exporter can mix page audio to AAC, and all three browsers can encode AAC, but the spike's controller reported no audio tracks.
- **Mobile WebViews.** Not measured. WebCodecs encode availability in iOS and Android in-app WebViews, and their memory limits, are unknown. Mobile hosts may also not advertise `downloadFile`.
- **Determinism across browsers.** The person's browser is not the render's headless shell. Canvas output differed by about 50 dB between GPU and software rasterization of the same Chromium version. In-view export matches what that browser shows, so the selection loop holds, but it won't be byte-identical to a `helios render`.

## Files

- `tests/spikes/in-view-export/` on the `spike/in-view-export` branch: the build, the page exporter, the view script, the spike server with `save_export`, the drivers (`host.mjs`, `measure.mjs`, `delivery.mjs`, `long.mjs`), the probes (`webcodecs-check.mjs`, `taint-check.mjs`), the basic-host patch, the pages, and `results/` with every number above.
