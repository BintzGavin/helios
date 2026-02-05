
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
