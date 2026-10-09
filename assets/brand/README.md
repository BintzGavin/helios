# Helios brand assets

Rules and rationale: `docs/brand/README.md`; the full book: `docs/brand/index.html`.

Every file here is generated. Change `generate.mjs`, then run:

```bash
node assets/brand/generate.mjs      # all SVGs here, docs/site/logo/*.svg, plugins/helios/assets/composer-icon.svg
node assets/brand/rasterize.mjs     # icon-*.png, social-card.png, docs/site/favicon.png, plugins/helios/assets/logo.png
```

`rasterize.mjs` needs `playwright` resolvable (it is in the repo's dev tooling; set `NODE_PATH` if it lives elsewhere) and uses the bundled Chromium.

| File | What it is |
| --- | --- |
| `mark.svg`, `mark-bone.svg`, `mark-solar.svg` | The mark on a 512 px box, one fill each, transparent background |
| `mark-compact.svg` | Compact cut (eight rays) for 24 px and below |
| `wordmark.svg`, `wordmark-bone.svg` | The drawn HELIOS wordmark |
| `lockup-horizontal.svg`, `-bone.svg`, `-solar-on-umbra.svg` | Primary signature |
| `lockup-stacked.svg`, `-bone.svg` | Stacked signature |
| `icon.svg`, `icon-128/256/512/1024.png` | App icon: Solar mark on Umbra, square; hosts round the corners |
| `composer-icon.svg` | 20 px monochrome icon using `currentColor`, for ChatGPT and Codex composers |
| `social-card.svg`, `social-card.png` | 1200 × 630 Open Graph image |
