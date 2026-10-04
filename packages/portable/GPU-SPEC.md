# Native GPU rendering contract

Integration base: `507de4c29b5b4f526cf97bd81ad126762b839685`.
Integration branch: `gavin/feat-native-gpu-rendering`.
The committed portable CPU implementation and its public TypeScript APIs remain available.

## Acceptance criteria

- Given no explicit GPU selection, when rendering, then existing resvg/native CPU Skia and software x264 behavior is preserved.
- Given an explicit GPU request, when the device, architecture, codec, surface interoperability or encoder initialization is unsupported, then reject with a structured reason before publishing output. Never silently use software.
- Given Metal on supported macOS, when rasterizing, then native Skia writes a GPU texture; a GPU kernel converts sRGB to limited-range BT.709 NV12 into an IOSurface-backed encoder buffer. No raw frame traverses JavaScript, a pipe, a CPU mapping or a CPU color converter in the hardware lane.
- Given a surface in flight, when conversion or encoding has not completed, then its owner retains it and cannot reuse it. Raster submission precedes conversion, conversion completion precedes encoder submission, encoder completion precedes recycle.
- Given an interruption or device/encoder error, when rendering stops, then resources are drained/released and no partial output is published as success.
- Given any valid half-open frame range, when encoding, then decoded count, dimensions and rational cadence match exactly; scene evaluation does not require prior frames.
- Given known colors and shuffled frame requests, when comparing own-rasterizer lossless references, then scene/color correctness is established independently of encoder speed.
- Given GPU raster plus software x264, when benchmarking, then explicitly report the required readback and use matched software settings; never label that lane zero-copy.
- Given a full hardware lane, when qualifying zero-copy, then preserve actual profiling and surface/transfer receipts. Hardware registration, capability flags and encoder success alone do not prove it. Encoded packet copies and scene/font/geometry uploads must also be disclosed.
- Given unsupported Vulkan hardware interop or unavailable hardware, when reporting the matrix, then identify each unsupported/unverified architecture/codec cell explicitly.

## HEVC codec extension acceptance

- Explicit `codec: 'hevc'` uses required hardware VideoToolbox HEVC Main (8-bit) on macOS arm64. Omitted codec preserves H.264. Unknown codecs reject independently in TypeScript and native CLI before GPU initialization; unavailable HEVC hardware fails without software fallback.
- The retained Metal raster and BT.709 limited-range NV12 conversion, pool capacities, fences, callback accounting and resource bounds are preserved. Only compressed packet extraction branches by codec: HEVC format descriptions use the HEVC parameter-set API and preserve VPS/SPS/PPS in Annex B.
- HEVC capability and completion receipts bind `codec: 'hevc'`, required/actual hardware, bitrate, GOP, pool and transport. HEVC JSON protocol6 and binary protocol7 prevent an older H.264 helper from being accepted. H.264 protocol4/5 and earlier frozen helpers remain usable and unchanged.
- MP4 remuxing uses the HEVC elementary demuxer and `hvc1` sample entry. Before atomic publication, decoded codec, dimensions, full frame count and rational cadence must match the request. Tests verify decoded limited BT.709 color, HEVC Main profile, range, both transports, callbacks and refusal of mismatched helper receipts.
- Qualification uses separate source/helper/runtime pins, direct NV12 references, every decoded frame and unchanged quality floors. Small scene qualification is not a full 4K comparison or speed claim; the comparison owner retains its harness and historical clocks.

## Bounded encoder overlap acceptance

### Bounded bitrate controls

TS, native CLI and the continuity adapter independently admit integer100,000..1,000,000,000bps targets; default20,000,000 remains unchanged. Noninteger, negative, nonfinite, over-bound and native integer-overflow values reject before GPU work. VideoToolbox's configured AverageBitRate must equal the requested target; changed/unsupported configuration fails closed. Native protocol4 receipts bind both values and TS verifies them before publication. A separately compiled changed-rate fault driver verifies rejection without software fallback. Small500Mbps hardware acceptance does not qualify full4K fidelity. Existing.995/40/35/35 floors are unchanged; the comparison owner retains failed8Mbps/200Mbps screens and runs separately pinned full300-frame quality gates.

- Opt-in `encoderPool: 3` permits at most three retained encoder inputs; omitted/explicit1 preserves serial behavior. Native protocol3 and later bind the setting in the receipt and independently reject any other capacity.
- Raster/conversion remains serial on one private texture with a required GPU completion fence before encoder submission. Each pooled input has an application reference through its complete callback body; VideoToolbox may retain it longer. Only CoreVideo's encoder pool can select a recycled buffer.
- Pool allocation has a fixed threshold. On pressure, drain through the oldest pending PTS outside the callback mutex, flush cached plane wrappers and retry exactly once. Never spin, grow the pool or overwrite an in-flight surface.
- Install bounded frame-index accounting and retained-buffer ownership before EncodeFrame, which may synchronously invoke its callback. Serialize packet/error/accounting state under a callback mutex. Unknown, duplicate, out-of-order, dropped or failed callbacks fail closed.
- EOF drains once and checks all submitted/completed frames before printing success. Invalidation/draining precedes releasing remaining ownership and State. Reference/readback modes stay synchronous. Existing atomic publication and cancellation semantics remain intact.
- On M3 Pro,215 portable tests, sanitizer-checked bounded-ledger scenarios, six of six focused ledger mutations and separately compiled genuine VideoToolbox callback drivers qualify synchronous/delayed completion and rejection of invalid callbacks. Thirty-six-frame serial/pool exports pass exact rational cadence and unchanged.995/40/35/35 per-frame floors; their decoded lossless reference exactly matches direct NV12 bytes. Full4K300-frame comparison and timing remain separately required. Confidence90% for this measured functional subset; opaque driver copies and remote hosts remain unqualified.
- A separate32-frame actualMetal/interposer profile reaches three in-flight frames, drains all32 callbacks, validates same-IOSurface plane fences and reuse after callback-owner release, and observes no instrumented raw download. NV12-map and RGBA-download positive controls each detect32 explicit downloads. GPU capture is excluded from timing/download proof. No performance improvement is claimed from this functional profile.

## Benchmark gates

### Circle/GOP extension acceptance

- A Canvas path containing one full-turn arc is filled by native Skia with its construction-time affine transform and fill-time paint. Nonuniform scale, rotations, path persistence across save/restore and repeated fill preserve Canvas semantics. Partial arcs, multiple contours and other path operations fail explicitly.
- GPU Canvas has an independent 120,000-command/32 MiB per-frame envelope, 64-state stack and 20,000 aggregate text-character budget. The native reader rejects oversized messages before unbounded allocation; it independently validates geometry, colors, command count, stack, text and decoded fonts. Encoded font headers have a separate48 MiB bound and32 MiB decoded budget. Existing Plan limits stay intact.
- GPU GOP accepts integers1..300, defaults90, propagates to required VideoToolbox H.264 and is recorded in protocol2 and later receipts. Invalid native CLI values fail before GPU initialization; mismatched TS/native receipt settings reject before publication. Encoded keyframe gaps are checked against explicit30.
- This extension has its own source/build/helper bindings. The frozen protocol1 helper and existing TextGrid videos/clocks/reference receipts remain historical, unchanged evidence.
- Circle/GOP verification on M3 Pro:212 portable tests, two native boundary tests, six of six focused TS mutations killed, CPU Canvas geometry comparison and actual95-frameGOP30 maximum-spacing check. A separate three-frame128x128Metal capture/interposer run observes no application raw download; NV12-map and RGBA-download positive controls trigger the expected hooks. This does not qualify the full4K300-frame workload, total zero-copy or another device. Device/encoder fault injection still refuses initialization without software fallback.
- The public4K circle scene is a scene replication: the upstream recorded renderer's checked-in scene does not match the documented measured scene/source hash. Preserve public circle math,1000x1000 viewBox scaling to3840x2160, painter order, pinned font, measured source frames3..302 and explicitGOP30. Do not claim exact-byte reproduction of the original7.225018333sM5Max run. Full300-frame quality/profiling and balanced timing belong to the comparison owner.

Continuity TextGrid: 3,334 changing labels, pinned DM Sans bytes, 1920×1080,
300 frames at 30 fps, no audio. The separate fframes 4K scene with 99,000
circles and 1,000 digits remains separately labeled. Establish per-engine
lossless references, normalized intended delivery color, all-frame quality
floors and exact cadence before interpreting speed. Exclude screening and
warmups; balance repeated fresh processes; never time engines simultaneously.
Retain every failed, slow and interrupted attempt. Interrupted exports are not
timing evidence. Prior portable native CPU timings are CPU-only.

## Confidence ledger

| Requirement | Status | Evidence / risk |
|---|---|---|
| Existing portable CPU implementation preserved | Source verified | Base contains package; primary checkout untouched |
| Existing fframes build state | Terminal failure verified | PID 30157 absent; saved stderr shows Skia dependency DNS failures |
| Native GPU release build | Passed on M3 Pro | Locked release, rust-skia 0.91.0 / Skia 143 / Metal; frozen helper SHA-256 `87aec3f3d39db8956490942429e6a865741c04515ad6b98753aaf6599c197a90` |
| API and fallback behavior | Passed | Full portable suite plus GPU public Plan/frame/range, rejection, abort and fault-injection checks |
| Metal shared surfaces / GPU conversion / synchronization | Passed on measured host | Actual Metal GPU capture, same IOSurface plane identities, GPU start/end stamps, encoder completion before recycle |
| Application raw CPU readback in hardware lane | None observed within instrumented boundary | Independent interposer; NV12-map and RGBA-download positive controls both detect intentionally exported raw pixels |
| Total end-to-end zero-copy | Unproved | System IOSurface pointer queries occur; opaque driver/encoder copies and unhooked operations remain unknown; `zeroCopyProved` stays false |
| Vulkan hardware encoding interop | Unsupported | Explicit refusal; no Vulkan hardware qualification on this macOS executor |
| Chromium equivalent GPU benchmarks | Passed for continuity TextGrid | Four AB/BA/BA/AB pairs, matched x264 settings/SEI, own references and every-frame fidelity/cadence/color; export medians 26.197 s native GPU and 30.199 s Chromium |
| Hardware benchmark / oracle correctness | Passed on measured host | All 300 corrected FFV1 frame hashes match directly split GPU NV12; four separate 100 Mbps repeats pass, median export 6.385 s; old oracle/quality receipts invalidated and retained |
| Full comparison follow-through | Scheduled | Thread heartbeat; originating comparison chat owns harness |

All raw receipts and generated media stay outside the repository.

Evidence alias: `/private/tmp/helios-gpu-evidence`. This is local
evidence, not a public artifact URL. The [protocol](benchmarks/GPU-PROTOCOL.md)
defines reproducible adapter commands and the scope of each proof. Initial red
checks preceded the native implementation; failing font-manager/viewport/
instrumentation/quality attempts remain retained and excluded.

The native implementation PR was externally merged as `5299bf7f9ad69f54c25b26b0b0774fbcc7d5f723`.
The benchmark oracle correction and measured report are a separate reviewable
change. See [the measured report](benchmarks/GPU-RESULTS.md) for durable receipt
locations and the invalidated-reference history. Confidence is 90% for the
measured macOS implementation; total zero-copy, Vulkan and remote hosts remain
unqualified, not complete requirements.

Hardware integration tests run only on macOS arm64 with the optional release
helper built. A missing helper skips that suite; a Linux test pass does not
qualify Metal. Device/encoder failure drivers are compiled separately by
`scripts/check-gpu-faults.mjs` and never linked into production. The separate
[HEVC qualification](benchmarks/GPU-HEVC-RESULTS.md) covers macOS arm64 HEVC Main
on a small300-frame scene. macOS Intel, Linux/Vulkan, GPU image/video nodes,
broad Canvas behavior and remote hardware remain unsupported. Existing CPU
backends remain available.
