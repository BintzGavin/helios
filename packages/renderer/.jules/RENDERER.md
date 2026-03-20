## Performance Trajectory
Current best: 53.379s (baseline was 54.770s, -2.5%)
Last updated by: PERF-001

## What Works
- Removed sequential await on FFmpeg write (~2.5% faster). This allows the Playwright capture loop to queue frames to Node up to the high-water mark, while FFmpeg reads from the pipe concurrently.

## What Doesn't Work (and Why)
- N/A

## Open Questions
- Are there further improvements that can be made to Playwright screenshot performance?
