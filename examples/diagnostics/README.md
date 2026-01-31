# System Diagnostics

This example runs `Helios.diagnose()` to check the capabilities of the current browser environment. It is useful for verifying WebCodecs support, WebGL availability, and other system requirements.

## How it works

1.  Initializes a dummy `Helios` instance.
2.  Calls the static `Helios.diagnose()` method.
3.  Renders the returned `DiagnosticReport` to the DOM.

## Key Features

- **WebCodecs Detection**: Checks for H.264, VP8, VP9, and AV1 support (both encoding and decoding).
- **Environment Checks**: Verifies WebGL, Web Audio, and OffscreenCanvas support.
- **Color Gamut**: Detects screen color capabilities (sRGB, P3, Rec2020).
