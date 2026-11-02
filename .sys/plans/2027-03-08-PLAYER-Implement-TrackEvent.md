#### 1. Context & Goal
- **Objective**: Use `TrackEvent` instead of a generic `Event` with a custom `.track` property for `addtrack` and `removetrack` events on TrackLists to ensure HTMLMediaElement parity.
- **Trigger**: The HTML5 `VideoTrackList`, `AudioTrackList`, and `TextTrackList` specifications require that `addtrack` and `removetrack` use the `TrackEvent` interface. `HeliosVideoTrackList`, `HeliosAudioTrackList`, and `HeliosTextTrackList` are currently instantiating generic `Event` and mutating them.
- **Impact**: Better alignment with standard Web APIs for track lists and standard compliance.

#### 2. File Inventory
- **Create**: `packages/player/src/features/track-event.ts` (helper/polyfill if needed, or inline it in each file since there's three). Given JS DOM doesn't always have `TrackEvent` we might want to safely instantiate it, or just use `window.TrackEvent` if it exists, otherwise polyfill it.
Actually, let's just create a custom `TrackEvent` polyfill/class in `packages/player/src/features/track-event.ts` and use it everywhere.
- **Modify**:
  - `packages/player/src/features/audio-tracks.ts`: Import `HeliosTrackEvent` and use it for `addtrack`/`removetrack`.
  - `packages/player/src/features/audio-tracks.test.ts`: Update tests.
  - `packages/player/src/features/video-tracks.ts`: Import `HeliosTrackEvent` and use it.
  - `packages/player/src/features/video-tracks.test.ts`: Update tests.
  - `packages/player/src/features/text-tracks.ts`: Import `HeliosTrackEvent` and use it.
  - `packages/player/src/features/text-tracks.test.ts`: Update tests.
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Create a `HeliosTrackEvent` class extending `Event` (or using `window.TrackEvent` if available) to provide the standard `track` readonly property. Use this class when dispatching `addtrack` and `removetrack`.
- **Pseudo-Code**:
```ts
export class HeliosTrackEvent extends Event {
    public readonly track: any;
    constructor(type: string, eventInitDict?: { track?: any }) {
        super(type);
        this.track = eventInitDict?.track || null;
    }
}
```
In TrackLists:
```ts
const event = new HeliosTrackEvent('addtrack', { track });
this.dispatchEvent(event);
```
- **Public API Changes**: Event objects passed to listeners of `addtrack`/`removetrack` will be `HeliosTrackEvent` instances with a readonly `track` property.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test --workspace=packages/player`
- **Success Criteria**: All tests pass. `addtrack` and `removetrack` event listeners receive an event with a `.track` property without custom mutation, matching `TrackEvent` structure.
- **Edge Cases**: N/A
