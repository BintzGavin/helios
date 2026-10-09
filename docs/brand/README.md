# Helios identity

The brand book is `docs/brand/index.html`. Open it in a browser; it is self-contained. This file is the short version for people and agents who need the rules without the plates.

## The idea

Helios draws a frame from its time. The mark is a sun whose rays count time: a solid disc and twelve equal-width rays, each one step longer than the last, clockwise from twelve o'clock. It reads as a sun, as a clock face and as a progress ring. The step between the longest and shortest ray is the playhead.

The construction follows mid-century trademark suns: one solid shape, one colour, no gradients, no outlines, no strokes.

## The mark

| Element | Value |
| --- | --- |
| Canvas | 100 × 100, disc centred at 50,50 |
| Disc radius | 19 |
| Ray inner radius | 27 |
| Ray outer radius | 33 → 48 in twelve equal steps |
| Ray width | 8, parallel-sided |
| First ray | twelve o'clock, shortest; direction clockwise |

- Clear space: one disc diameter (38% of the mark's width) on every side.
- Minimum size: 24 px for the full mark. Below that use the compact cut (`mark-compact.svg`, eight rays). Never use the compact cut above 32 px.
- Colour versions: Umbra on Bone (default), Bone on Umbra (reverse), Solar on Umbra (signature). Umbra on Solar is allowed for posters and merchandise only. Solar never sits on a light background.

## The wordmark

HELIOS is drawn, not typed: cap height 100, stem 22, H E L I from bars, O a ring, S two arcs of radius 20.25 on one centreline with flat terminals. Round letters overshoot the cap line by 1.5. Letter widths H 80, E 68, L 64, I 22, O 100, S 67; spacing H·E 16, E·L 16, L·I 11, I·O 15, O·S 15. Always capitals, always one colour, always the supplied vector. In running text write "Helios".

## Lockups

- Horizontal (primary): mark 140 tall beside a 100 cap-height wordmark, gap 44, mark centred on the wordmark's middle. Docs header, README, CLI banner, wide listings.
- Stacked: mark 220 tall, gap 36, both centred. Splash screens, stickers, title cards.
- Mark and wordmark in a lockup are always the same colour. No other arrangements. Never replace the O with the mark.

## Colour

| Name | Hex | Role |
| --- | --- | --- |
| Umbra | `#0E0D0B` | Ink, dark surfaces, the mark on paper |
| Bone | `#F3EEE3` | Paper, light surfaces, text on Umbra |
| Solar | `#F5B400` | The sun. Fills, the mark on Umbra, focus rings. Never text on light |
| Solar Deep | `#7F5900` | Solar as text or links on Bone (5.5:1) |
| Ember | `#E4572E` | Errors, destructive actions. `#B8401C` for body text on Bone |
| Noon | `#2F7FE0` | Links in UI, selection, informational state. `#1D5FB8` on Bone |

Neutral ramp, all warm: 900 `#0E0D0B`, 800 `#1C1A17`, 700 `#3B3833`, 500 `#6F695F`, 300 `#A39C90`, 200 `#D9D2C3`, 000 `#F3EEE3`.

Light surfaces (docs, website): Bone, Umbra text, Solar Deep emphasis. Dark surfaces (Studio, player): Umbra, Bone text, Solar emphasis.

## Typography

| Role | Face | Weights | Use |
| --- | --- | --- | --- |
| Display | Jost | 500, 600 | Headlines and titles, never below 22 px, never paragraphs |
| Text | IBM Plex Sans | 400, 500, 600 | Everything read |
| Mono | IBM Plex Mono | 400, 500 | Code, CLI output, timecodes, eyebrows, captions |

Sentence case everywhere except eyebrows and the wordmark. Tabular figures for anything that counts. Body copy at most 65 characters wide.

## Motion

The mark has one move: it seeks. Rays switch on clockwise from twelve o'clock, 2 frames per ray at 30 fps, 24 frames total, then hold. Step, never ease. Reverse to wind out. Loop only as a loading state with a 12-frame hold. Everything else is time-driven: linear 6-frame fades, elements enter in place, nothing slides or bounces. Reduced motion gets the final frame.

## Voice

Accurate first: Helios is a deterministic renderer that calls no generative model. Concrete over clever. Short sentences, active voice, no exclamation marks. Web standards are the hero. Inside AI hosts, state limits and link to heliosrender.com; no prices, plan names or upgrade prompts. The tagline is "Video is light over time." and it is the only tagline.

## Do not

Add gradients or a second colour to the mark, outline it, rotate it, mirror it, add shadows or glows, stretch it, put Solar on a light background, put anything inside the disc, use the old eight-ray glyph or the sun emoji, or build sun variants for sub-brands.

## Assets

Everything is generated. Edit the numbers in `assets/brand/generate.mjs`, not the files.

```bash
node assets/brand/generate.mjs      # vectors, docs logo, plugin composer icon
node assets/brand/rasterize.mjs     # PNG icons, favicon, plugin logo, social card
```

See `assets/brand/README.md` for the file index.
