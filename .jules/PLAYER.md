## [v0.46.0] - Deprecation Confirmation
**Learning:** Confirmed that `mp4-muxer` and `webm-muxer` are deprecated and `mediabunny` is the correct replacement with a unified API covering WebCodecs abstraction.
**Action:** When migrating libraries, always verify the replacement package exists and scan its API (via `npm install` + inspection if docs are unavailable) to ensure architectural fit before implementation.
