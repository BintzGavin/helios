
## [2026-03-05] - Smart Audio Fades Gap
**Learning:** Declarative audio fades (`data-helios-fade-out`) are calculated relative to the video duration, causing short, non-looping clips to fade out incorrectly (or not at all). This violates the "Use What You Know" principle as users expect fades to be relative to the clip itself.
**Action:** Created plan `2026-03-05-RENDERER-Smart-Audio-Fades.md` to implement smart fade logic by resolving source duration in `DomScanner` and updating `FFmpegBuilder`.

## [2026-03-06] - Distributed Audio Priming Gap
**Learning:** Distributed rendering concatenates chunks rendered with lossy codecs (AAC), causing audio priming artifacts (clicks) at chunk boundaries. This affects Implicit Audio (DOM) which is rendered per-chunk.
**Action:** Created plan `2026-03-06-RENDERER-Robust-Distributed-Audio-Pipeline.md` to standardize on uncompressed PCM (`.mov`) intermediate chunks and force a final transcode pass.
