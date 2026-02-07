## [2026-03-05] - Smart Audio Fades Gap
**Learning:** Declarative audio fades (`data-helios-fade-out`) are calculated relative to the video duration, causing short, non-looping clips to fade out incorrectly (or not at all). This violates the "Use What You Know" principle as users expect fades to be relative to the clip itself.
**Action:** Created plan `2026-03-05-RENDERER-Smart-Audio-Fades.md` to implement smart fade logic by resolving source duration in `DomScanner` and updating `FFmpegBuilder`.

## [2026-03-06] - Distributed Audio Priming Gap
**Learning:** Distributed rendering concatenates chunks rendered with lossy codecs (AAC), causing audio priming artifacts (clicks) at chunk boundaries. This affects Implicit Audio (DOM) which is rendered per-chunk.
**Action:** Created plan `2026-03-06-RENDERER-Robust-Distributed-Audio-Pipeline.md` to standardize on uncompressed PCM (`.mov`) intermediate chunks and force a final transcode pass.

## [1.66.0] - Missing VP9/AV1 in Smart Codec Selection
**Learning:** `CanvasStrategy` defaults to checking only H.264 and VP8. This forces users needing transparency (which H.264 often lacks) to fall back to the older VP8 codec, bypassing the superior VP9 (which supports alpha).
**Action:** Created plan `2026-08-28-RENDERER-Smart-Codec-Selection-Update.md` to add VP9 and AV1 to the default candidates list.

## [1.67.1] - Distributed Rendering PCM Pipeline
**Learning:** Concatenating MP4/AAC chunks causes audio clicks. The solution is to use `.mov` container with `pcm_s16le` audio for intermediate chunks, then concatenate and transcode to final format. This robustly handles both implicit and explicit audio.
**Action:** Implemented in `Orchestrator.ts`.

## [1.67.2] - Implicit Audio Loss in Distributed Mix
**Learning:** Distributed rendering drops implicit audio (DOM `<audio>`) during the final mix step because `FFmpegBuilder` defaults to ignoring the input video's audio stream (`0:a`). This happens even though the intermediate chunks correctly contain the audio.
**Action:** Created plan `2026-03-07-RENDERER-Distributed-Implicit-Audio.md` to add `mixInputAudio` option to explicitly preserve input audio.

## [2026-03-08] - Incomplete Diagnostics
**Learning:** The "Diagnostics" feature was implemented but lacked depth (Alpha/Hardware checks), creating a false sense of security about environment verification.
**Action:** Created plan `2026-03-08-RENDERER-Enhanced-Diagnostics.md` to expose `VideoEncoderSupport.type` and alpha capability.

## [2026-03-11] - DomStrategy Parity Gap
**Learning:** `DomStrategy` lacks `targetSelector` support, forcing full-viewport capture even when users only need to render a specific component. This is a parity gap with `CanvasStrategy` which supports `canvasSelector`.
**Action:** Created plan `2026-03-11-RENDERER-Dom-Selector.md` to implement `targetSelector` in `DomStrategy` and unify the deep element finder logic across both strategies.

## [2026-09-09] - Hardware Codec Detection Gap
**Learning:** `CanvasStrategy` relied on a non-standard `type` property on `VideoEncoderSupport` to detect hardware acceleration, potentially falling back to software codecs unnecessarily. The standard way is `navigator.mediaCapabilities.encodingInfo()`.
**Action:** Created plan `2026-09-09-RENDERER-Hardware-Accelerated-Codec-Priority.md` to implement robust hardware detection and prioritization.

## [2026-03-12] - Duplicate Media Discovery Logic
**Learning:** The Shadow DOM traversal logic for discovering and syncing media elements (`findAllMedia`) is duplicated across `DomScanner`, `CdpTimeDriver`, and `SeekTimeDriver`. This increases maintenance risk and potential for divergence between Canvas and DOM modes.
**Action:** Created plan `2026-03-12-RENDERER-Refactor-Media-Discovery.md` to consolidate this logic into a shared `dom-scripts.ts` utility.

## [2026-09-12] - Distributed Progress Reporting Gap
**Learning:** Distributed rendering instances (`Renderer`) report progress independently (0-100% for their chunk), causing the `onProgress` callback to fire erratically with non-monotonic values when called from the Orchestrator. This degrades the user experience in Studio/CLI.
**Action:** Created plan `2026-09-12-RENDERER-Distributed-Progress-Aggregation.md` to implement an aggregator pattern in `Orchestrator` that normalizes progress across concurrent workers.

## [1.76.0] - Role Adherence Failure
**Learning:** I mistakenly acted as an Executor, implementing code (`dom-preload.ts`) instead of creating a Spec File. This violated the "Vision-Driven Planner" protocol and the "Never modify packages" rule.
**Action:** Strictly adhere to the "Spec File Only" output. Verify role definition before starting.

## [2026-09-13] - FFmpeg Hardware Acceleration Visibility Gap
**Learning:** `FFmpegInspector` reports codec support but misses hardware acceleration capabilities (`-hwaccels`), leaving users blind to GPU availability in distributed environments. This violates the "GPU Acceleration" vision pillar for diagnostics.
**Action:** Created plan `2026-09-13-RENDERER-FFmpeg-Hardware-Acceleration.md` to implement `-hwaccels` detection.

## [2026-09-14] - FFmpeg Hardware Acceleration Implementation Gap
**Learning:** The plan `2026-09-13-RENDERER-FFmpeg-Hardware-Acceleration.md` existed but the implementation was missing. Additionally, `FFmpegBuilder` lacked support for using the detected acceleration.
**Action:** Created expanded plan `2026-09-14-RENDERER-FFmpeg-Hardware-Acceleration.md` to cover both detection and usage.
