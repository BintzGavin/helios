# Measured native GPU rendering: 2026-10-03

Native Skia Metal with matched software x264 exported continuity TextGrid in
26.197 seconds median, versus Chromium's 30.199 seconds. Native was faster in
all four pairs; the median export interval is 13.25% shorter. A separate
VideoToolbox H.264 lane at 100 Mbps exported in 6.385 seconds median and passed
the same every-frame fidelity floors. These are complete export intervals,
**not isolated GPU raster timings**. Hardware and software codec settings are
different and are reported separately.

## Frozen workload, host and clocks

Apple M3 Pro, 11 CPU cores, 14 GPU cores, 18 GB RAM, macOS 26.3. TextGrid has
3,334 changing labels, pinned 72,000-byte DM Sans, 1920×1080, 300 frames at
30/1 fps and no audio. Font SHA-256:
`9ae2da663d64342031e59b5fa680dd355171d021b7ebf83774efc7c0330ae7b5`.
Each engine has its own lossless delivery-color reference; independent text
edges are not claimed identical.

Fresh processes were sequential, after excluded warmups, in native/Chromium,
Chromium/native, Chromium/native, native/Chromium order. No timed engines ran
simultaneously. The comparison chat deferred heavy work during the timing
windows. All four completed exports per setting are retained, including their
original clocks. References, screens, warmups, profiler executions and quality
checks are excluded from export summaries.

| Lane | Export seconds by round | Median | Range |
|---|---|---:|---:|
| Native Metal raster + x264 | 26.201, 26.011, 26.194, 26.287 | 26.197 | 26.011–26.287 |
| Chromium Canvas/Graphite capture + x264 | 30.004, 30.156, 30.242, 30.564 | 30.199 | 30.004–30.564 |
| Metal + VideoToolbox H.264, 100 Mbps | 6.248, 6.305, 6.508, 6.466 | 6.385 | 6.248–6.508 |
| Metal + VideoToolbox H.264, 180 Mbps | 9.148, 8.955, 8.667, 8.103 | 8.811 | 8.103–9.148 |

Startup, scene/font preparation, capture/raster, encoding, mux and output writes
are included in `renderingMs`; decoded verification is excluded. Native GPU
software exports read RGBA back to a raw pipe; Chromium captures lossless PNG
over CDP/base64. Capture transport cost is included. This is a one-context,
two-encoder-thread software comparison, not the earlier multi-worker CPU study.

The hardware API fully decodes before publishing. At 100 Mbps, including that
required API check gives delivered times 7.767, 7.856, 8.057 and 8.053 seconds,
median **7.955 seconds**. Additional adapter probes/decoded metadata collection
cost about 11.48–11.59 seconds per attempt in total, including the API check;
the full adapter process is a different clock. Original process receipts and
`/usr/bin/time -l` stdout/stderr preserve those checks. Do not add redundant
verification to one lane or compare this export interval to an upstream clock
with a different boundary. The two hardware bitrate sets were measured
separately and are not pooled or treated as balanced causal optimization pairs.

Software H.264 SEI strings are identical: x264 core 165 r3222 b35605a, medium,
CRF 11, threads 2, lookahead_threads 1, B frames 0, keyint 90, scenecut 0,
rc_lookahead 40, qcomp 0.60, qpmin 0, qpmax 69, qpstep 4 and aq 1:1.00.
Full strings are retained. Both lanes convert sRGB to limited-range BT.709
YUV420. Hardware uses required VideoToolbox H.264, GOP 90, no frame reordering,
Metal sRGB-to-BT.709 conversion and NV12 encoder-pool surfaces. All delivered
files report limited BT.709 primaries/transfer/matrix and exact decoded cadence.

## Fidelity and reference correction

Every frame must meet SSIM-Y ≥ 0.995, PSNR-Y ≥ 40 dB and PSNR-U/V ≥ 35 dB.
All included rounds pass all 300 fidelity rows and decoded timestamps. Native
x264 minima are SSIM-Y 0.995917 / PSNR-Y 45.48 dB. Chromium passes its own
reference, with minimum SSIM-Y above 0.9959 / PSNR-Y above 45.4 dB. At hardware
100 Mbps, every repeat has minima 0.995232 / 42.48 / 42.19 / 42.06 dB for
SSIM-Y / PSNR-Y / PSNR-U / PSNR-V. Hardware 180 Mbps has much more margin;
20 and 40 Mbps screens fail, while 100 and 140 Mbps screens pass. Screening
times are excluded and a bitrate target is not a universal quality guarantee.

The original hardware reference omitted input NV12 color metadata. FFmpeg
changed pixel values despite explicit output tags; a known red NV12 sample
`[63,63,63,63,102,240]` became `[58,58,58,58,105,229]`. Adding `setparams`
before planar layout conversion fixes the oracle. The original reference and
its quality qualifications are **invalidated and retained**, not retagged as
if their pixels were correct. The corrected reference's 300 decoded frame
hashes all match separately exported native GPU NV12 split into planar Y/U/V
without pixel arithmetic, with zero mismatches. Original completed candidate
videos and render clocks were preserved and requalified with new receipts.
The stricter post-render gate failure was a complete export with a bad oracle,
not an interrupted timing. Regression red and green receipts are retained.

## GPU execution, transfers and limitations

A real Metal `.gputrace` captures Skia raster resources, GPU conversion and
NV12 planes. Capture snapshots resources and is excluded from timing and from
the transfer proof. A separate independent interposer instruments the entire
300-frame hardware execution without capture. It verifies hook installation,
300 GPU conversions and encoder callbacks, one IOSurface identity, actual GPU
start/end timestamps, conversion completion before submission, and callback
completion before surface reuse.

Observed hardware events: zero hooked CVPixelBuffer/IOSurface locks, texture
`getBytes` or texture-to-buffer downloads; 3 buffer-to-texture uploads, 8,404
buffer contents accesses of unknown intent, 610 IOSurface plane pointer queries
and 1 whole-surface pointer query. Resource extents on pointer queries are not
copied byte counts. Font/scene commands and glyph/geometry data are CPU inputs;
compressed H.264 packet copies are CPU output. The NV12 positive control detects
3 CPU pixel-buffer locks and 6 plane getters; the RGBA positive control detects
3 texture-to-buffer downloads of 8,294,400 bytes each. Both use the frozen
helper and separate instrumentation, never production-linked drivers.

Chromium's separate exact-fixture trace records 3 Canvas finalizations,
47 Graphite GPU submissions and 3 full-size 1920×1080 async pixel readbacks.
Capability flags are inventory, not GPU proof. The profile is a separate
execution and does not attest every timed frame. Hidden driver/encoder copies,
unhooked APIs and the intent of system pointer/buffer accesses remain unknown.
**Total end-to-end zero-copy is not proved; `zeroCopyProved` remains false.**

The frozen measured helper implements macOS arm64 Metal/H.264. It did not
support the99,000-circle public-API claim scene. Later independently pinned
helpers add bounded full-circle paths, configurable GOP/pool/bitrate and compact
binary commands; see [GPU-PROTOCOL.md](GPU-PROTOCOL.md). These changes do not
alter the original videos/clocks or establish new full-scene quality or speed
results. HEVC, Vulkan hardware interop, macOS Intel/Windows, GPU image/video
nodes, broad Canvas parity and remote GPU execution remain unsupported.
The originating comparison chat owns the separate trusted-adapter/full
Helios/fframes/Remotion comparison. Its M5 Max 4K single-run claim, different
Skia/usvgr source pins, BT.601/BGRA hardware surface and clock boundaries are
not pooled with this M3 Pro BT.709/NV12 TextGrid study. No win over that claim
is asserted here.

## Reproduction and durable receipts

Implementation source commit: `5e0cc9c7ba29d6d30dbd2fadfe1e3dfbcc101872`.
PR #5009 was externally merged at 2026-10-03 14:32:12 UTC as
`5299bf7f9ad69f54c25b26b0b0774fbcc7d5f723`; this task did not merge it.
Native helper SHA-256:
`87aec3f3d39db8956490942429e6a865741c04515ad6b98753aaf6599c197a90`.
The follow-up changes only the oracle filter, its regression and measured docs.

Locked Rust release uses official `skia-safe`/`skia-bindings` 0.91.0,
Skia milestone 143, Metal, thin LTO. Cargo's successful prebuilt archive was:
`https://github.com/rust-skia/skia-binaries/releases/download/0.91.0/skia-binaries-fab0a5adad3361364d3e-aarch64-apple-darwin-metal-pdf-svg-textlayout-webpd-webpe.tar.gz`.
Cargo cache is `/private/tmp/helios-gpu-cargo`; source/build/toolchain logs and
Cargo checksums are retained. This archive does not establish ABI compatibility
with current fframes' upstream Skia 0.153.3 or the old custom fframes fork.

Durable local evidence root:
`/Users/gavinbintz/.codex/visualizations/2026/10/03/01a101cb-eaad-7290-9c09-0640b9deae94/native-gpu-evidence`.
`/private/tmp/helios-gpu-evidence` remains a symlink alias for original receipt
paths. These are local evidence locations, not public artifact URLs. No media,
profiling binaries, task-specific scripts or generated verification receipts
are committed. See [GPU-PROTOCOL.md](GPU-PROTOCOL.md) for adapter commands.

Key receipts: `FINAL-REPORT.json`, `FINAL-BUILD-PINS.json`,
`RECEIPT-MANIFEST.json`, `hardware-reference-direct-binding.json`,
`final-reference-hardware-tagged/reference.mkv`,
`final-reference-software/reference.mkv`,
`chromium-reference-software-01/reference.mkv`, all `round-*` / `hardware100-*`
directories, per-attempt/process stdout/stderr, `full-profile-interposer.jsonl`,
`full-profile-transfer.jsonl`, `final-positive-controls.jsonl`,
`final-metal.gputrace`, and `chromium-profile-02/chrome-trace.json`.

Portable build and the full 202-test suite passed, followed by 14 focused GPU
checks including the new oracle regression. Device/encoder fault drivers fail
closed. Confidence is 90% for this measured host/subset; unsupported hardware,
opaque total zero-copy and the full cross-engine GPU comparison remain gaps.
