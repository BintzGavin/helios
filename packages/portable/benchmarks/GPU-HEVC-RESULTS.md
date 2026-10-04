# Metal / VideoToolbox HEVC qualification

Explicit `gpu.codec: 'hevc'` now encodes HEVC Main through required hardware VideoToolbox on macOS arm64. This is a functional qualification on Apple M3 Pro, not a benchmark or full 4K comparison. H.264 remains the default; its frozen helpers and earlier clocks/references are unchanged.

The independent helper SHA-256 is `9c2b3654ce681d9764643214a745878b8fecb72ed9fcd69f3aea7f0fa709d9ae`. Evidence is outside the repository at `/Users/gavinbintz/.codex/visualizations/2026/10/03/01a101cb-eaad-7290-9c09-0640b9deae94/hevc-evidence`.

| Gate | Measured result |
|---|---|
| Scene | 256×128, 300 independently evaluated frames at 30000/1001 fps; RGB/white fields, transformed moving circle, pinned Noto Sans text |
| Encoder | Required/actual hardware HEVC Main, 20 Mbps requested=configured, GOP30, pool3, binary transport |
| Direct reference | Every FFV1 planar frame hash equals the corresponding directly split GPU NV12 bytes; all300 exact |
| Decoded delivery | HEVC/hvc1, Main, yuv420p, limited BT.709 primaries/transfer/matrix; all300 exact rational PTS and count |
| Every-frame floors | SSIM Y≥.995 and PSNR Y/U/V≥40/35/35 dB; worst .999980 / 69.38 / 68.29 / 68.94 |
| Actual GPU stages | 300 raster submissions, conversion GPU timestamps, same-IOSurface planes, encoder submissions/callbacks and owner releases; peak3 in flight; no surface reacquired before callback-owner release |
| Transfer hooks | No hooked pixel/IOSurface lock or texture-download calls in the hardware run; NV12 control detects6 locks and RGBA control detects3 texture-to-buffer downloads |
| Separate Metal capture | Three frames, excluded from timing and uncaptured transfer proof |
| Public API transport/range | JSON and binary HEVC, half-open36-frame range and rational cadence; default pool1 and opt-in pool3 |
| Failure controls | Device, encoder, changed configured bitrate, hardware-used=false and HEVC-format extraction faults refuse success; existing destination survives format failure |

Hardware profiling also observes655 IOSurface plane-pointer queries,5 base-pointer queries and541 Metal buffer-contents accesses with unknown intent. Scene/font/geometry uploads and compressed packet CPU copies are disclosed. Opaque driver/encoder transfers remain unknown; `zeroCopyProved=false`.

`qualification-01/REPORT.json`, `direct-byte-binding.json`, `decoded-cadence.json`, indexed `ssim.txt`/`psnr.txt`, `INDEPENDENT-AUDIT.json`, profile/interposer hashes, fault receipts and command logs retain the raw evidence. `BUILD-READY.json` and `RECEIPT-MANIFEST.json` bind source/runtime/helper identities and every saved artifact. Test-first acceptance rejected HEVC before implementation, then passed. The full portable suite passes229 checks; five focused codec/protocol/hardware receipt mutations are caught after a passing baseline and exact source restoration.

Confidence is90% for this measured host and functional subset. Full4K HEVC quality/performance, other hardware, Vulkan interoperability, GPU media and broader Canvas parity remain unqualified or unsupported. The original fframes MaxPerformance production outputs still fail quality qualification; the separate serial adapter result does not establish a fully enabled production win. Native Library delivery remains separately blocked.
