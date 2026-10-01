# Portable rendering implementation contract

This implements the provider-neutral production rendering RFC as an experimental package. The implementation must report its supported profile and measured limitations; it must not advertise the RFC's unmeasured qualification gates as passed.

1. Given a data-only scene and immutable assets, submitting it returns a durable job identity. Repeating an idempotency key with identical inputs returns that job; different inputs conflict. Unknown capabilities and unsafe inputs fail before rendering.
2. Given a valid scene, a browser-free renderer evaluates any requested frame independently. Geometry, transforms, clips, layout, multilingual text, images and prepared video combine into pixels; native and Wasm rasterizers use the same scene representation. The complete native pipeline encodes MP4/H.264 and continuous AAC audio.
3. Given interruption between chunks, a fresh service process resumes from verified committed artifacts. Storage transitions are conditional, leases expire, stale executors cannot publish, cancellation survives restart, and final success requires a playable verified output. A failed/canceled job cannot expose a success artifact.
4. Given a caller's workflow, the HTTP SDK can upload assets, submit, poll/advance, cancel and retrieve output. A function can perform one bounded durable work step without relying on background work after its response. A long-running service can drive the same steps automatically.
5. Given the same plan on native and Wasm rasterizers, frame pixels and layout must match within the declared tolerances. Codecs remain native until complete Wasm media execution is proved. Real deployed VM/function qualification is distinct from local handler tests.
6. Given a request from outside a trusted local/private deployment, the host supplies authentication and a tenant identity. Scene input cannot specify shell commands, execute JavaScript, read arbitrary files, or fetch arbitrary network locations. Object identity and output routes are scoped to the tenant.
7. Given a new cloud account requirement, a human-run wizard guides setup using platform secret storage. The agent statically checks the wizard and does not run it or inspect credentials. User consent to create these wizards has already been provided.

Verification expands from an actual short encoded render to media/text/layout, fault recovery, API/CLI integration, cross-rasterizer comparisons, deployment packaging and a repeatable benchmark corpus. Generated outputs and task-specific validation configuration stay outside the repository.

## Retained Skia performance backend

The explicit `skia` option preserves the accepted scene, seek, color, audio and durable-job contracts. It uses native CPU Skia with retained decoded assets and glyph paths, raw RGBA media and bounded per-frame drawing history. The existing `native` resvg default and resvg `wasm` comparison remain available. The Skia backend is a separate engine identity; it cannot resume a job created by a different renderer build.

Skia and resvg have different edge antialiasing, image filtering and byte-alpha rounding. Exact resvg native/Wasm parity is a separate contract. Skia must pass known-pixel, glyph-shaping, shuffled-frame, real-media/color and process-death recovery checks, with measured frame and encoded-video fidelity reported alongside matched-quality performance results. It must not silently lower resolution, cadence, encoder quality or output verification to obtain a speedup. See [the performance protocol](benchmarks/PERFORMANCE.md).
