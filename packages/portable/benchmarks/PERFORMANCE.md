# Local performance comparison

**Evidence retention (2026-10-01):** Earlier `/private/tmp` benchmark evidence is unavailable. Historical measurements below are reported records, not freshly reverified results or a current public competitor claim. The [fresh October 1 study](../../../docs/rfcs/2026-10-01-cpu-benchmarks.md) links its retained source receipts; its every-frame quality and complete cadence checks remain pending.

Improve the portable implementation while preserving its input, pixel, timing and durable-job contracts. Chromium is a comparator only; do not change the existing web renderer as part of this experiment.

- Given the frozen B01–B08 scenes and identical assets, compare fresh local workers sequentially on the same host. Report frame dimensions, duration, codec settings, warm-up, repetitions and timing boundaries. Do not compare an earlier busy-machine run with a new idle run as the primary speedup claim.
- Given a proposed optimization, require an executable before/after performance check and unchanged independently sampled frame pixels or a documented fidelity tolerance. No lowering resolution, skipping requested frames, changing encoder quality or dropping verification to obtain a win.
- Given media, animated groups, clips, overlapping opacity and random seeking, optimized rendering must preserve the original output and cancellation/recovery behavior.
- Given expensive repeated work, measure frame evaluation, rasterizer construction, image resolution, rasterization, pixel extraction and media decode separately before choosing the implementation language.
- Given Chromium output, verify dimensions, frame count and representative frame fidelity before comparing times. Distinguish a controlled rasterizer substitution from the existing Helios web renderer and disclose shared preparation/codec stages.
- Keep raw profiles, comparison videos and baseline source snapshots outside the repository. Report gains, regressions and remaining bottlenecks; do not claim universal superiority from synthetic workloads.

Acceptance: obtain a meaningful repeatable speedup on the media/image-heavy fixtures with unchanged tested output, no material unexplained regression on graphics/text fixtures, and a passing correctness/recovery suite. The compact-runtime and cloud gates remain separate measurements.

## Drawing backends

The reference snapshot is the pre-optimization TypeScript/resvg implementation. The candidate is TypeScript plus retained native Skia surfaces through a pinned Rust Node-API binding. It keeps explicit fontkit glyph shaping and the existing FFmpeg/x264/AAC pipeline. It is an opt-in native backend, not a complete Wasm pipeline.

The Chromium comparator runs the same drawing interpreter with browser Canvas2D and pre-shaped glyphs. Source video uses browser-native media; capture uses lossless PNG via CDP with speed optimization. All candidates use the same software x264 settings and durable chunk/finalization checks. This isolates a useful browser-versus-native deployment choice; it is not an arbitrary-HTML benchmark or a comparison against browser WebCodecs/hardware encoding. Browser bundle setup is included in its measured service time. Initial Node module loading is excluded from service time and retained in the whole-process measurement, which also includes post-render oracles.

Profiling found rasterization dominated the media fixtures. The candidate caches decoded still images and glyph paths, streams raw RGBA video instead of PNG round trips, and prerenders an unchanged initial layer sequence. Group opacity is applied after composing children. Different rasterizers can differ at antialiased edges and byte-alpha rounding; fidelity must be measured alongside speed, and resvg remains available.

## Results and reproduction

The [local performance evidence](../../../docs/rfcs/2026-09-09-portable-rendering-performance.md) records the 45-run comparison, the shape regression, all-frame quality and full-length follow-up. `profile.ts` separates frame-generation stages; `compare.ts` runs the original source snapshot, Skia and installed Chromium sequentially; `quality.ts` compares every encoded frame against regenerated uncompressed Skia after the same pinned color conversion and records cross-renderer SSIM/PSNR plus PNG sample differences.

The quality gate is luma SSIM >=0.995, luma PSNR >=40 dB and each chroma-plane PSNR >=35 dB on every frame, matching the RFC. Cross-renderer differences are reported separately and are not substituted for codec-loss qualification. Source snapshots, frozen assets and the Chromium executable are explicit command-line inputs; the example local paths are conveniences, not portable dependencies.


## CPU-only fframes comparison

`fframes.ts` extracts the original TextGrid scene from the pinned upstream source into a CPU-only binary, avoiding GPU/native-player dependencies. Compilation and downloaded build artifacts stay under the requested scratch output directory. The fixture preserves all 3334 changing text nodes over 300 frames. The Helios side uses the explicit trusted Canvas API; this is a native Canvas/SVG comparison, not arbitrary DOM or an automatic conversion of existing HTML compositions.

```sh
npm run build --workspace=@helios-project/portable
npx tsx packages/portable/benchmarks/fframes.ts --prepare-fframes \
  --fframes-source /tmp/fframes-pinned --out /tmp/helios-fframes
npx tsx packages/portable/benchmarks/fframes.ts \
  --fframes-bin /tmp/helios-fframes/cargo-target/release/helios-fframes-cpu-comparison \
  --font /tmp/fframes-pinned/render-bench/vs-remotion/fframes/media/DMSans-Regular.ttf \
  --out /tmp/helios-fframes --workers 4 --encoder-threads 2 --repeats 5
```

The checkout must be at commit `bacfc3c3212d3d9429468435bfdc1ae2a21c7b3b`. The build requires Rust/Cargo, a C compiler, pkg-config and x264 development libraries. Run both commands on each claimed host. Do not reuse a macOS binary on Linux.

The harness interleaves fresh processes, records complete stdout/stderr and exit status, samples process-tree RSS, and independently decodes all 300 frames for both engines. By default both engines use the same explicit worker count and per-encoder thread count; `--fframes-workers` and `--fframes-encoder-threads` allow a disclosed comparison with upstream automatic threading (`0` encoder threads). It records comparable process time excluding full decode verification, and complete service time including one full final verification for each engine. Helios keeps its final verification inside the API; fframes verification runs after its render timer. Never compare those raw timers without accounting for this boundary. Color conversion defaults to explicit BT.601 to match the upstream component conversion; `--color-conversion srgb-bt709` measures Helios' normal transfer/color path separately. FFmpeg builds, SVG/Canvas text rasterization and chroma sampling still differ.

`compare.ts --variants baseline-skia,skia --reference /tmp/frozen/packages/portable` compares a frozen Skia source snapshot with the current Skia implementation using the existing durable-job corpus and pinned production codec settings.

`opacity.ts --reference /tmp/frozen/packages/portable --out /tmp/opacity-evidence` runs three alternating old/new measurements of 200 moving text labels, including opaque and translucent variants. It checks two full uncompressed frames per variant against the two-level edge tolerance and requires at least a 2× improvement on translucent text. This measures drawing, excluding preparation and encoding.

The dense TextGrid fixture at CRF18 did not pass the existing per-frame codec-loss gate. Helios passes at CRF12, but fframes narrowly misses the luma SSIM gate on its own raw-frame oracle. Use `--crf 11` for the separately measured comparison with both engines passing; this is a different benchmark configuration from upstream's published CRF18 table. `fframes-quality.ts --font FONT --video VIDEO --out DIRECTORY` regenerates and compares all 300 raw Canvas frames after the exact production conversion. For a fframes video, use `--fframes-bin BINARY` instead of the font: the oracle calls upstream CPU `render_frame` and its own native YUV converter, preserving its top-left chroma sampling. Both must pass the same SSIM/PSNR thresholds before qualifying a speed result.

The pinned upstream ultrafast MP4 declares 300 packets but its edit list causes normal decoding to discard the final frame. `--repair-fframes-edit-list` preserves that original artifact and stream-copies its video into an MP4 without an edit list. The harness includes the additional repair cost and requires 300 decoded frames. This flag affects only the ultrafast fframes comparison; report it explicitly rather than treating the incomplete original as a valid result.

The [qualified local CPU comparison](../../../docs/rfcs/2026-09-29-cpu-rendering-benchmark-goal.md) records five paired repetitions on an M3 Pro at CRF11, four workers and two encoder threads per engine. Median render times are 13.48/19.22 seconds for Helios/fframes medium and 5.52/11.39 seconds for ultrafast, with all-frame quality and completeness checks passing. Including one full final verification per engine gives 24.39/31.59 and 9.06/15.58 seconds respectively. Existing durable-job scenes are effectively unchanged; the translucent-text drawing microbenchmark improves 30.98×.

The [scheduler CPU qualification](../../../docs/rfcs/2026-09-30-scheduler-cpu-benchmark.md) records an initial Linux CPU pair at the same CRF11 quality gates, two workers and one encoder thread. Render times are 69.799/108.698 seconds medium and 26.414/53.796 seconds ultrafast; speedups including full final decoding are 1.482× and 1.848×. All four outputs independently decode 300 frames and pass every frame's quality thresholds. Helios uses roughly twice the sampled process-tree memory. Three interleaved pairs per preset subsequently qualified all twelve outputs, with Helios winning all six render pairs. Repeated median render speedups are 1.740× medium and 2.146× ultrafast; including full final decode gives 1.584× and 1.911×. The entire repeated archive was independently streamed and hash-verified without storing another full copy. Compact evidence is retained after removal of temporary full videos. These measurements do not establish universal DOM speedups or superiority on upstream's published CRF18 configuration.
# Component timing acceptance

Measured Canvas ranges retain `drawMs` as the historical combined rasterization and pixel-readback timer. Additional `rasterizeMs` and `pixelExtractionMs` counters separate those stages without changing frame bytes or seeking. Each process reports module/canvas/font initialization as `preparationMs` only on its first completed range; reused ranges report zero. Initialization includes module loading and is not a font-only timer. Encoding overlaps drawing, so component counters and concurrent worker times must not be summed into elapsed service time. Existing comparison capsules and previously recorded timers remain unchanged.
