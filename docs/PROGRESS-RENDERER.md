## RENDERER v1.41.0
- ✅ Completed: Support Shadow DOM Audio Discovery - Updated `scanForAudioTracks` utility to recursively traverse Shadow DOM for media elements using `TreeWalker`.

## RENDERER v1.40.1
- ✅ Completed: Enable Full Verification Coverage - Updated `run-all.ts` to include 6 additional verification scripts, and fixed `verify-dom-media-preload.ts` and `verify-dom-preload.ts` to be robust and self-contained.

## RENDERER v1.40.0
- ✅ Completed: Implement WAAPI Sync - Updated `SeekTimeDriver` to manually iterate over `document.getAnimations()` and set `currentTime`, ensuring correct synchronization of CSS animations and transitions for DOM-based rendering.

## RENDERER v1.39.0
- ✅ Completed: CdpTimeDriver Media Sync - Implemented manual synchronization for `<video>` and `<audio>` elements in `CdpTimeDriver` to respect `data-helios-offset` and `data-helios-seek`, enabling correct playback in Canvas renders.
