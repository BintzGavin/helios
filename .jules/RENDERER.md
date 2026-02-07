## [2026-10-18] - WebCodecs Determinism Gap (Retry)
**Learning:** Re-identified the WebCodecs determinism gap. The original plan from 2026-09-15 was not executed. `CanvasStrategy` still strictly prioritizes hardware encoding.
**Action:** Created fresh plan `2026-10-18-RENDERER-WebCodecs-Preference.md` to introduce `webCodecsPreference` option. This is critical for reliable regression testing.

## [1.79.1] - Missing Web Audio Support
**Learning:** `CanvasStrategy` lacks `AudioEncoder` integration, preventing capture of procedural audio generated via Web Audio API.
**Action:** Documented as a known limitation; future work should explore `AudioContext` capture.

## [1.79.1] - Codec/PixelFormat Mismatch
**Learning:** No validation exists for incompatible combinations like `libx264` + `yuva420p` (alpha channel), which causes FFmpeg to fail silently or produce corrupted output.
**Action:** Future task should implement strict validation in `FFmpegBuilder` to warn or fail fast on invalid combinations.

## [1.79.1] - GSAP Fragility
**Learning:** `SeekTimeDriver` relies on the `window.__helios_gsap_timeline__` global for synchronization, which is fragile if the user doesn't expose it correctly or uses multiple timelines.
**Action:** Future task should consider more robust discovery mechanisms or an explicit registration API.
