## [2026-09-15] - WebCodecs Determinism Gap
**Learning:** `CanvasStrategy` strictly prioritizes hardware encoding (if available) via `VideoEncoder`. This introduces potential non-determinism across different GPUs, violating the project's goal of bit-exact rendering for regression testing.
**Action:** Created plan `2026-09-15-RENDERER-WebCodecs-Preference.md` to introduce `webCodecsPreference` option, allowing users to force software encoding or disable WebCodecs entirely.
