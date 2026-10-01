# Audit of fframes' published rendering claims

**Evidence retention (2026-10-01):** Earlier `/private/tmp` benchmark evidence is unavailable. Historical measurements below are reported records, not freshly reverified results or a current public competitor claim. The [fresh October 1 study](2026-10-01-cpu-benchmarks.md) links its retained source receipts; its every-frame quality and complete cadence checks remain pending.

The earlier Helios comparisons establish wins at explicitly capped worker and encoder settings. They do not establish that Helios beats fframes' fastest configuration or reproduce its published M4 Max results. This audit checks the primary claims, source, timing boundaries and fourteen additional CPU-only fframes renders.

## Published claims

The [upstream TextGrid benchmark](https://github.com/dmtrKovalenko/fframes/blob/main/render-bench/vs-remotion/README.md) reports CPU medians of **6.80 seconds medium / 44.1 fps** and **3.15 seconds ultrafast / 95.3 fps**. It uses an M4 Max with 16 CPU cores and 64 GB memory, CRF18 and default CPU concurrency. Its encoder does not receive an explicit thread limit. The best GPU medians are 6.29 and 2.60 seconds; those are outside our CPU-only target. Its 1.50× and 2.85× headlines compare GPU fframes with Remotion, not Helios.

The workload is 3334 changing labels per frame, 300 frames, 1920×1080, 30 fps, ten seconds, DM Sans Regular 10px, without audio. The million-node total aggregates all frames. Release compilation is excluded; process startup, font loading, rendering, encoding and muxing are included. Upstream reports five interleaved rounds with ten-second cooldowns. It discloses that CPU outputs decode 299 frames.

## Local settings audit

All additional runs use our M3 Pro with 11 logical CPUs and 18 GiB memory, software x264 and the unchanged pinned CPU implementation. Eleven explicit workers approximate the hardware-default concurrency without inspecting environment overrides. Encoder `threads=0` requests automatic threading; encoded x264 metadata confirms 16 threads per segment. CRF11 remains the separately qualified output-quality setting from the earlier comparisons.

| fframes configuration | Repeats per preset | Medium median | Ultrafast median | Ultrafast with complete-frame repair |
| --- | ---: | ---: | ---: | ---: |
| Published M4 Max, CRF18, default concurrency | 5 | 6.800 s | 3.150 s | Not reported |
| New M3 Pro, CRF18, eleven workers, automatic encoder threads | 3 | 14.964 s | 6.820 s | 7.004 s |
| New M3 Pro, CRF11, eleven workers, automatic encoder threads | 3 | 19.621 s | 7.691 s | 7.982 s |
| New M3 Pro, CRF18, four workers, two encoder threads | 1 | 17.622 s | 13.015 s | 13.015 s |
| Earlier qualified M3 Pro, CRF11, four workers, two encoder threads | 5 | 19.222 s | 11.385 s including repair | Included |

The CRF18 eleven-worker audit is 2.20×/2.17× slower than the published CPU medians. Different hardware, builds, host load and sampling conditions prevent attributing that gap to any one cause. These results neither reproduce nor disprove the M4 Max claims. They contain no new Helios timing runs and are not paired engine comparisons.

Automatic threading materially improves local ultrafast fframes performance. The CRF11 complete-frame median falls from the earlier capped 11.385 seconds to 7.982 seconds. Comparing this sequential audit with the earlier Helios median of 5.524 seconds would not establish a new qualified speedup. Medium shows substantial variability: CRF18 eleven-worker runs span 14.092–19.906 seconds. This audit uses fresh processes and alternating profile/preset order, but no warmup or cooldown; OS caches and host load are uncontrolled.

## Source and completeness checks

The generated CPU harness contains the original pinned scene verbatim, with upstream cache capacities and encoder defaults. It adds argument controls for worker count, CRF and threads. No custom release optimization profile was found. The shared CPU segment writer opens a separate encoder per segment; the earlier concern about a single shared encoder was refuted.

Our source pin is `bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b`; the published README names `1070159`, resolved to `10701592c15d21891412b2d8b79728699e5fd589`. CPU rendering, scheduling, segment writing, encoding, stream setup, concatenation and encoder-frame source files are byte-identical between these pins. The published pin does not contain the TextGrid benchmark directory, so the complete published harness cannot be reconstructed from that commit alone. This audit uses the scene present at our explicitly recorded pin.

All fourteen new exports pass full decoding, resolution, cadence, duration and 300-frame checks after any repair. All six automatic-thread ultrafast originals decode 299 frames; stream-copy edit-list repair restores 300, costs 0.124–0.290 seconds and is reported separately. The other eight originals decode 300. Verification decoding is outside the render timer. This audit does not rerun the all-frame SSIM/PSNR oracle, so it introduces no quality-qualified superiority claim.

Records, source checks and two frame-150 stills are retained outside the repository at `/private/tmp/helios-fframes-goal/claimed-benchmark-audit`. The newly generated videos were removed by their own temporary-directory lifetimes after checks. Previously protected benchmark evidence is unaffected.

## Benchmark conclusion

The existing local and scheduler wins remain valid within their disclosed capped profiles. There is no upstream CPU-only Linux TextGrid result in this table against which to reproduce the scheduler numbers. A broader claim requires independent worker/encoder tuning for both engines on the same host, repeated interleaved runs at CRF18 and at a common quality-qualified setting, and complete output checks. Beating the published absolute numbers additionally requires comparable hardware; an M4 Max timing cannot be treated as an M3 Pro or shared Linux Sandbox baseline.
