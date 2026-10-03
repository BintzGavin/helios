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

## Benchmark gates

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
| Chromium equivalent GPU benchmarks | In progress | Frozen native own-reference screens pass all 300 frames at x264 CRF 11 and hardware 180 Mbps; actual Chromium Graphite trace and own-reference quality pass; balanced rounds exclude warmups/screens/profiles |
| Full comparison follow-through | Scheduled | Thread heartbeat; originating comparison chat owns harness |

All raw receipts and generated media stay outside the repository.

Current evidence directory: `/private/tmp/helios-gpu-evidence`. This is local
evidence, not a public artifact URL. The [protocol](benchmarks/GPU-PROTOCOL.md)
defines reproducible adapter commands and the scope of each proof. Initial red
checks preceded the native implementation; failing font-manager/viewport/
instrumentation/quality attempts remain retained and excluded.

Hardware integration tests run only on macOS arm64 with the optional release
helper built. A missing helper skips that suite; a Linux test pass does not
qualify Metal. Device/encoder failure drivers are compiled separately by
`scripts/check-gpu-faults.mjs` and never linked into production. HEVC, macOS
Intel, Linux/Vulkan, GPU image/video nodes, broad Canvas behavior and remote
hardware are explicitly unsupported. Existing CPU backends remain available.
