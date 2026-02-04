
## [2026-03-05] - Smart Audio Fades Gap
**Learning:** Declarative audio fades (`data-helios-fade-out`) are calculated relative to the video duration, causing short, non-looping clips to fade out incorrectly (or not at all). This violates the "Use What You Know" principle as users expect fades to be relative to the clip itself.
**Action:** Created plan `2026-03-05-RENDERER-Smart-Audio-Fades.md` to implement smart fade logic by resolving source duration in `DomScanner` and updating `FFmpegBuilder`.
