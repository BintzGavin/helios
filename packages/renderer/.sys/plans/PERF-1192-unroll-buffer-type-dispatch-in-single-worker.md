---
title: "Unroll buffer type dispatch in single worker chunk writer"
status: impossible
slug: unroll-buffer-type-dispatch-single-worker
---

## Objective
Unroll the buffer type dispatch (`typeof buffer === "string"`) in the single worker path by branching on `isDomStrategy` outside the chunk writer loops.

## Outcome
IMPOSSIBLE: DUPLICATION. Exploring `packages/renderer/src/core/CaptureLoop.ts` reveals that the single worker fast path (`poolLen === 1`) is already completely unrolled and branched on `isDomStrategy` at the highest level. The single-worker paths for `isDomStrategy` (base64 string) and canvas (Buffer) are entirely separate fast paths.
