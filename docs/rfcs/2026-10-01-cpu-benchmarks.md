# CPU benchmark progress: 2026-10-01

## Measured improvement

Portable rendering now caps full output decode verification at the smaller of eight threads and Node's available CPU parallelism. Freshly encoded internal chunks retain one-thread packet counting. Full decode, frame-count, geometry, codec and FPS/duration checks remain in place.

```text
Render and encode chunks → stitch MP4 → fully decode and verify → deliver
                                       1 thread → min(8, available CPUs)
```

A fresh study on an Apple M3 Pro with 11 available logical CPUs compares frozen baseline and actual compiled candidate builds. The scene is the pinned fframes TextGrid: 3334 changing labels, DM Sans, 1920×1080, 300 frames at 30 fps. Both variants use software H.264, CRF11 and identical per-preset encoding and worker settings. One warmup per variant/preset is excluded; three fresh process pairs alternate order.

| Preset | Baseline median delivered time | Candidate median delivered time | Median of within-pair speedups | Candidate wins |
| --- | ---: | ---: | ---: | ---: |
| Medium | 23.751 s | 14.028 s | 1.588× | 3/3 |
| Ultrafast | 7.280 s | 4.413 s | 1.669× | 3/3 |

The speedup column is the median of individual baseline/candidate time ratios, rather than the ratio of the separate time medians. Delivery includes process startup, preparation, drawing, software encoding, stitching and final full decode verification. Compilation, source hashing and output hashing are outside individual timers. Each of the six timed pairs has byte-identical output. All sixteen saved exports, including four warmups, were independently rehashed against their original receipts; 72 source/runtime hash bindings remain unchanged.

Medium uses four drawing workers and eight encoder threads per worker; ultrafast uses six drawing workers and four encoder threads per worker. Worker sums are not wall time because drawing and encoding overlap. These results describe the experimental native Canvas path, not an automatic speedup for arbitrary browser compositions. Local load varies: the earlier standalone baseline is a separate study and must not be combined with these paired results.

Chart data copied from the original nanosecond timers, with individual pair references and component statistics, is saved as `decoder-gain-chart-data.json` in the durable study root. This is an input for the eventual video handoff, not a public competitor claim. Further tuning should target drawing/encoding: the decoder change already removes most of the final verification overhead.

## Evidence and outstanding work

Authoritative local receipts are under `/Users/gavinbintz/.codex/visualizations/2026/09/28/01a0e813-a2b5-78e0-978e-6a278c8e331e/cpu-benchmarks-20261001/paired-decode-export-v1/results/full-v1/`: `manifest.json`, original per-pair/per-export records, component statistics, `candidate.diff`, `paired-result-summary.json` and `artifact-binding-check.json`. These are local evidence paths, not public reproduction links. The earlier `/private/tmp` evidence is unavailable; its original exports and timers must not be reconstructed or silently repeated.

Every-frame codec fidelity and complete cadence are now qualified for the retained native Helios and fframes outputs and Remotion JPEG100 outputs. The separate local three-engine holdout is now qualified for this native TextGrid scope. Remote confirmation and merge remain unfinished; closing checks have passed. No broad or remote superiority claim is approved. Once measurements and quality checks finish, merge the proven changes and prepare the motion-graphics handoff with public reproduction instructions, source pins, hardware, chart data, wins/ties/losses and limitations. The video must distinguish native Canvas from browser rendering and use only supported claims.

The fresh three-engine study uses provisional settings. Its initial Remotion run selects SwiftShader and software x264, but lacks runtime GPU compositor/rasterization attestation, so its timings are not yet qualified CPU-only comparison results. It uses PNG screenshots; upstream's claimed results use JPEG at the default quality of 80. The completed separate strict CPU Remotion study uses explicit GPU, compositor and GPU-rasterization disabling flags with runtime evidence for the relevant DOM stages and compares faster JPEG options. JPEG fidelity has now been measured against a lossless source reference. The completed fframes CPU worker-count study compares four, six and eleven workers at two encoder threads per segment; those are per-segment encoder threads, not a global two-thread limit.

## Fresh medium resource screening

A separate Helios study held four drawing workers and CRF11 fixed while comparing two, four and eight encoder threads per worker. Each setting has one excluded warmup and three balanced timed rounds. Median delivered times are 13.307, 12.465 and 12.757 seconds respectively. Four threads won all three within-round comparisons against eight, with median paired ratio 0.9836803 (about 1.7% faster). This modest result selects a candidate benchmark setting; it does not change the general renderer default. Bitstreams differ between settings, and every-frame codec fidelity and cadence now pass the existing policy for every saved setting.

A separate fframes CPU study held two encoder threads per segment and CRF11 fixed while comparing four, six and eleven drawing workers. Median delivered times, including external full-decode verification, are 18.561, 16.485 and 15.847 seconds respectively. Eleven workers was fastest in all three balanced rounds among these tested counts. Its twelve original result/process receipts, complete-decode metadata and MP4 hashes were checked against retained files; original nanosecond timers were preserved. Worker count changes segmentation and bitstreams, so this is provisional resource screening, not a superiority result.

These independent sweeps must not be combined into a paired competitor speedup. The strict CPU Remotion JPEG comparison is a further separate study. Final comparisons need complete cadence, every-frame source-reference quality measurements, settings disclosure and repeated matched timed exports where still necessary. Original completed exports will not be rerun merely to regenerate evidence.

Screening receipts are `encoder-thread-study-v1/results/full-v1/manifest.json`, `fframes-worker-study-v1/results/full-v1/manifest.json` and `fframes-worker-receipt-check-v1.json` beneath the durable study root described above.

## Strict CPU Remotion JPEG screening

A fresh medium/CRF11 Remotion study uses explicit GPU, GPU-compositing and GPU-rasterization disabling flags. All twelve runs record software compositor and rasterization stages through the browser CDP API, plus actual software x264 settings. Three balanced timed runs per setting, after one excluded warmup each, give delivered medians of 21.267 seconds for JPEG80/six workers, 25.436 seconds for JPEG100/six workers and 24.417 seconds for JPEG100/eleven workers. Delivery includes one external eight-thread full decode. All original process/result/detail receipts, 740 source/runtime bindings and twelve MP4 hashes were verified unchanged.

These are provisional settings measurements. JPEG80 is faster but requires measurement against lossless PNG source frames to disclose its additional capture loss. This study changes browser CPU flags and image format relative to the earlier PNG study, so their difference cannot be attributed solely to JPEG. No superiority ratio may be constructed by combining separate screening studies. Every saved JPEG100 output now passes complete cadence and the existing every-frame fidelity policy; JPEG80 fails that fidelity policy and is excluded from matched-quality selection. Receipts are `remotion-cpu-jpeg-study-v1/results/full-v1/manifest.json` and `remotion-cpu-jpeg-receipt-check-v1.json` beneath the durable root.

## Saved-output fidelity qualification and measurement correction

No completed export was rerun. Seventy-six saved exports were grouped into twelve unique output-hash/reference pairs. Each output was checked against its own engine’s lossless source reference: Canvas for Helios, the pinned native CPU rasterizer for fframes, and lossless PNG screenshots for Remotion. All delivered outputs have exactly 300 frames and exact 30 fps cadence. Reference, source, runtime and saved output bindings are retained independently of the original render timers.

The policy comes from the existing `packages/portable/benchmarks/fframes-quality.ts`: every frame must have Y-plane SSIM ≥0.995, Y-plane PSNR ≥40 dB and U/V-plane PSNR ≥35 dB. Eleven of twelve unique output/reference pairs pass. JPEG80 fails; JPEG100 passes at six and eleven workers, whose output bytes are identical. JPEG100 is therefore the eligible strict-CPU Remotion setting, even though JPEG80 screened faster.

The first measurement used a floating timestamp expression that rounded some Remotion MP4 timestamps one tick early, causing comparison with a prior reference frame. A separate saved-output correction uses an exact common rational clock (`settb=expr=1/30,setpts=N`) for the four affected Remotion metric sequences, after checking actual cadence. Eight native measurements remain unchanged. Both the original measurement and correction are retained, and no render timer or saved video changed. Measurement durations are not render-performance results.

Corrected policy receipts are `quality-policy-results-clock-v1.json`; original and corrected manifests are respectively `quality-measurement-v1/results/full-v1/manifest.json` and `quality-clock-revision-v1/results/full-v1/manifest.json`. This measures compression/capture loss against each engine’s own reference. Different native rasterizers are disclosed; passing this policy does not establish identical pixels or equal perceptual quality across engines. The original PNG Remotion outputs also pass fidelity, but their compositor/rasterization stages remain unattested and they are excluded from strict CPU claims.

The next fresh studies tune remaining native worker settings and ultrafast settings, then use separate balanced three-engine holdout rounds. Screening medians are never combined into a competitor superiority ratio. All historical completed exports and failed attempts remain preserved.

## Fresh Helios medium worker screening

A new study compared four worker/encoder-thread settings with one excluded warmup each and three timed rounds in ABCD/DCBA/BDAC order. These are new independent exports, not historical reruns. Original delivered medians were 13.000 s for 4/4, 13.367 s for 6/2, 14.395 s for 8/2 and 13.978 s for 11/1. The 4/4 control has the fastest median among these settings and is selected for the separate holdout; this sweep demonstrates no additional worker-count gain and changes no general default.

All sixteen exports bind to four unique saved-output quality measurements. All 300 frames pass the existing per-plane fidelity floors and exact cadence. Root checked the saved per-export results and process receipts against original manifest timers and recomputed screening medians; videos were not rerendered. Identical new outputs share inodes while retaining every original path: 2.132 GiB logical MP4s occupy 0.533 GiB unique file bytes. Receipts: `final-cpu-studies-v1/results/medium-screen/full-v1/manifest.json`. This is resource screening, not a competitor superiority result. The separate ultrafast screen is running.

## Fresh ultrafast resource screening

A separate fresh screen completed 36 exports: one excluded warmup and three rotated timed rounds for each of nine settings. Every setting passes exact cadence and the existing every-frame fidelity floor, with seven unique delivered-output/reference measurements. Root checked original per-export results/process receipts and timers, recomputed medians, inspected all 300 metric rows for each unique delivered output and rehashed all nine unique saved video files, including retained fframes originals. No export was rerun.

| Engine | Workers / encoder threads | Delivered median | Eligible |
| --- | --- | ---: | --- |
| Helios | 6 / 4 | 4.794 s | Yes |
| Helios | 8 / 2 | 4.578 s | Yes |
| Helios | 11 / 1 | 4.671 s | Yes |
| fframes | 6 / 2 | 9.432 s | Yes |
| fframes | 11 / 2 | 7.616 s | Yes |
| Remotion JPEG100 | 6 / 1 | 22.232 s | Yes |
| Remotion JPEG100 | 11 / 1 | 24.078 s | Yes |
| Remotion JPEG100 | 6 / 8 | 19.867 s | Yes |
| Remotion JPEG100 | 11 / 8 | 18.956 s | Yes |

The fastest qualified medians select Helios8/2, fframes11/2 and Remotion JPEG10011/8 for the independent holdout. This is selection among these tested settings, not global optimality or a competitor superiority result. H/F encoder threads are per segment/worker; Remotion DOM worker concurrency is distinct from encoder concurrency. The slowest Remotion11/1 timed attempt (37.862 s) remains included; no outlier was dropped. fframes timings include the retained original export, stream-copy edit-list repair and full delivered-output decode. This study retains 8.681 GiB logical MP4 paths in 1.781 GiB unique file bytes. Receipts: `final-cpu-studies-v1/results/ul-screen/full-v1/manifest.json`.

## Independent matched local holdout

The completed holdout has one new excluded warmup per engine/preset and three fresh timed rounds in HFR/FRH/RHF order. Screening times are excluded. All 24 exports and original process/component receipts are retained. Root recomputed medians and ratios from original nanosecond delivered clocks, verified all output hashes (including fframes originals), 769 source/runtime bindings and profile-selection manifest hashes, inspected all 1,800 unique delivered-output quality rows and recomputed exact cadence from raw ffprobe integer PTS. All six unique delivered output/reference pairs pass the existing every-frame fidelity floor and all 300 frames at 30 fps.

| Preset | Native Helios median | fframes CPU median | Strict CPU Remotion median | fframes/Helios ratio of medians | Remotion/Helios ratio of medians |
| --- | ---: | ---: | ---: | ---: | ---: |
| Medium | 11.991 s | 15.204 s | 24.040 s | 1.267925× | 2.004853× |
| Ultrafast | 4.211 s | 7.358 s | 18.166 s | 1.747400× | 4.314147× |

Helios wins all three within-round comparisons against each competitor in each preset. Ratios above divide separate engine medians, unlike the earlier Helios decoder study's median of within-pair ratios. Both definitions and all individual clocks are retained; these studies are never pooled.

Original timed delivery clocks in nanoseconds, ordered by timed round:

| Preset / engine | Round 1 | Round 2 | Round 3 |
| --- | ---: | ---: | ---: |
| Medium Helios | 11990895250 | 11883339541 | 12093428833 |
| Medium fframes | 15197427542 | 15203560167 | 15769708541 |
| Medium Remotion | 24181038583 | 23864236959 | 24039981583 |
| Ultrafast Helios | 4210728167 | 4540987958 | 3757034500 |
| Ultrafast fframes | 7357826791 | 7618406083 | 6988056042 |
| Ultrafast Remotion | 17995099333 | 18383750583 | 18165699834 |

The M3 Pro has 11 available logical CPUs. Helios uses medium4/4 and ultrafast8/2 workers/encoder threads, fframes11/2 both presets, Remotion JPEG10011/8 both presets. H/F encoder threads are per segment/worker; Remotion browser concurrency is distinct from encoder concurrency. Actual x264 SEI parameters match across engines in each preset except those disclosed encoder thread counts. Strict CPU Remotion records all three disable flags and software compositor/rasterization stages in every run. The native paths use CPU rasterization and software x264.

Delivery includes startup, rendering/encoding, stitch and successful full final decode. Helios performs internal full decode once; fframes and Remotion perform external eight-thread full decode once. fframes ultrafast also includes timed stream-copy edit-list repair to expose all 300 encoded frames; its original artifact is retained. Hashing, setup/builds and every-frame quality are outside delivery clocks. Different segmentation and rasterizers are disclosed: this is matched scene semantics, software codec and fidelity floors, not identical cross-engine pixels or an all-browser workload ranking. No GPU, remote or global optimality claim follows.

Holdout receipts are `final-cpu-studies-v1/results/holdout/full-v1/manifest.json` (SHA256 `097fb0d8bd5381203a4755d05267fd04416e56f641be2798f226e510aed90461`) and `final-holdout-results-v1.json` under the durable root. Retained MP4 paths total 5,280,376,676 logical bytes; identical new files occupy 1,320,094,169 unique file bytes. Older failed studies remain separate and unavailable temporary evidence is not reconstructed. A compact public reproduction bundle is being prepared without rerunning any completed export.

## Closing validation

With timed performance work finished, the unchanged lock installed offline and portable TypeScript plus all 189 tests across 33 files passed. All 19 rebuilt JavaScript files match the actual frozen benchmark candidate byte for byte. The scheduler's 20 focused streaming/audio/readiness tests, Node bundle serialization regression and TypeScript check passed. Temporary validation configuration avoids secret/config loading and uses the installed local Workers compatibility fallback. A temporary-config startup failure and restricted-runtime startup failure are retained separately; one normal local runtime escalation then passed. No source/test fix or broad unrelated suite was added. Merge integration must preserve upstream work and the measured source; deployment remains a separate authorization.
