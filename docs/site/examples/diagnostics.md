---
title: "Diagnostics Example"
description: "Using Helios.diagnose() to verify environment capabilities"
---

# Diagnostics Example

This example demonstrates how to use `Helios.diagnose()` to programmatically inspect the runtime environment's capabilities. This is useful for debugging rendering issues or verifying support for specific features like WebCodecs or WebGL.

## Overview

The `Helios.diagnose()` static method returns a promise that resolves to a `DiagnosticReport`. This report includes information about:
- **User Agent**: Browser version and platform.
- **WebCodecs**: Support for VideoEncoder (H.264, VP8, VP9, AV1).
- **Web Audio API**: Whether AudioContext is supported.
- **OffscreenCanvas**: Support for headless canvas rendering.
- **Color Space**: Supported color gamuts (sRGB, P3, Rec2020).

## Example Code

```typescript
import { Helios } from '@helios-project/core';

async function runDiagnostics() {
  const report = await Helios.diagnose();

  console.log("Environment Diagnostics:", report);

  // Check for H.264 support
  if (report.webCodecs.videoEncoder) {
    console.log("H.264 Support:", report.webCodecs.h264 ? "Yes" : "No");
  }

  // Display report in the UI
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(report, null, 2);
  document.body.appendChild(pre);
}

runDiagnostics();
```

## Typical Output

```json
{
  "userAgent": "Mozilla/5.0 ...",
  "webCodecs": {
    "videoEncoder": true,
    "videoDecoder": true,
    "h264": true,
    "vp8": true,
    "vp9": true,
    "av1": false
  },
  "webAudio": true,
  "offscreenCanvas": true,
  "colorSpace": {
    "srgb": true,
    "p3": true,
    "rec2020": false
  }
}
```
