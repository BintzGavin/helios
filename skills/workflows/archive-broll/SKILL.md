---
name: archive-broll
description: Find, preview, cut and credit archival B-roll from the Internet Archive (archive.org) for a Helios video — public-domain, CC BY and CC BY-SA film plus Prelinger Archives. Use when a Helios composition needs real footage as a plate, cutaway, masked fill or texture. Not for generating footage or editing the user's own camera video.
---

# Archive B-roll

The [Internet Archive](https://archive.org/developers/) holds millions of films: Prelinger Archives (industrial, educational, advertising), NASA, newsreels, home movies and Creative Commons uploads. No API key is needed. [`scripts/archive-broll.mjs`](scripts/archive-broll.mjs) (Node 18+, ffmpeg for `clip`) wraps three endpoints:

| Command | Endpoint | Does |
|---|---|---|
| `search` | `advancedsearch.php` | Lists movie items with reusable rights |
| `inspect` | `metadata/<id>` | Picks the best MP4, saves thumbnails named by second offset |
| `clip` | `download/<id>/<file>` | Cuts only the seconds you need over HTTP, writes credits |

## 1. Search

```bash
node <this-skill>/scripts/archive-broll.mjs search "factory assembly line" --rows 12
node <this-skill>/scripts/archive-broll.mjs search "city traffic" --collection prelinger --years 1945-1965
node <this-skill>/scripts/archive-broll.mjs search 'title:(rocket launch)' --collection nasa --json
```

Terms use Archive search syntax (`title:(...)`, `subject:(...)`, `AND`, `OR`); results are ranked by relevance (`--sort downloads` for popularity). Every result carries a rights label:

| Label | Meaning |
|---|---|
| `public-domain` | Public-domain mark or CC0. Credit anyway. |
| `cc-by` | Credit required. |
| `cc-by-sa` | Credit required, and the finished video must use the same license. Tell the user before using it in a commercial video. |
| `collection-policy` | No item license; the collection publishes a rights statement (Prelinger Archives). Credit the collection and link the statement. |

Non-commercial, no-derivatives and unknown-rights items are left out. `--include-unknown` shows unknown items; use one only after the user confirms they hold the rights. Labels come from uploader metadata: they're a filter, not legal advice. Flag anything that looks like a commercial film, TV show or trademark-heavy footage even when it's labelled public domain.

## 2. Preview

```bash
node <this-skill>/scripts/archive-broll.mjs inspect <identifier> --out videos/<slug>/broll --thumbs 16
```

Writes `item.json` and thumbnails named by offset (`00450s.jpg` = 7:30 in). Open them with your image tool and pick start times. `--large` grabs sharper 640 px frames with ffmpeg when the archive's 160 px thumbnails aren't enough.

## 3. Cut

```bash
node <this-skill>/scripts/archive-broll.mjs clip <identifier> --start 450 --duration 3 \
  --out videos/<slug>/broll --name traffic-01.mp4
```

Output is H.264, no audio (`--audio` keeps it), short keyframe interval so per-frame seeking stays cheap; `--width 1920` upscales. Cut about 0.5 s extra on each side for transitions. Each clip appends to `CREDITS.md` and `credits.json` in the output folder.

## 4. Use in the page

The renderer seeks every `<video>` to `(t - data-helios-offset) + data-helios-seek` before each frame and waits for it.

DOM page: place it and style it.

```html
<video id="plate" src="broll/traffic-01.mp4" muted playsinline preload="auto"
       data-helios-offset="4.0" data-helios-seek="0.5"></video>
```

Canvas page: keep the same hidden `<video>` (`style="display:none"`), and wait for its seek inside `renderAt` before drawing:

```js
const plate = document.getElementById('plate');
const settled = (v) => (v.seeking || v.readyState < 2)
  ? new Promise((r) => { v.addEventListener('seeked', r, { once: true }); v.addEventListener('canplay', r, { once: true }); })
  : null;

window.renderAt = async (t) => {
  await ready;
  if (t >= 4.0) { await settled(plate); ctx.drawImage(plate, 0, 0, W, H); }
  // ...
};
```

Make the footage belong to the look: grade it with an SVG colour matrix, `mix-blend-mode`, or by drawing it into the style's plates (duotone, halftone, ink density). Most archive film is 4:3 SD from the 1940s–70s: masks, frames and collage suit it better than full-bleed. Check a sheet to confirm the clip moves between frames.

## 5. Credit

Keep `CREDITS.md` with the video, and put credits in the end card, description or project docs as the license requires (always for CC BY and CC BY-SA). List the clips and their rights when you hand over.
