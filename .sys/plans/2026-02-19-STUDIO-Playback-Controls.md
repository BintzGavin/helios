# Plan: Implement Playback Controls & Timeline

## 1. Context & Goal
- **Objective**: Implement the Playback Controls (Play, Pause, Loop) and Timeline (Scrubber, Time Display) in the Studio UI, and wire them to the `<helios-player>` via a Bridge Controller.
- **Trigger**: Vision Gaps "Playback Controls" and "Timeline Scrubber" in README.md.
- **Impact**: Enables users to control the video preview from the Studio interface, a fundamental requirement for the IDE.

## 2. File Inventory

### Create
- `packages/studio/src/lib/bridge.ts`: A controller class to communicate with the iframe via `postMessage`.
- `packages/studio/src/context/StudioContext.tsx`: React Context to manage the Controller instance and player state.
- `packages/studio/src/hooks/useStudio.ts`: Hook to consume the context.
- `packages/studio/src/components/Timeline/Timeline.tsx`: The visual timeline and scrubber component.
- `packages/studio/src/components/Timeline/Timeline.css`: Styles for the timeline.
- `packages/studio/src/components/Controls/PlaybackControls.tsx`: Play/Pause/Rewind buttons.
- `packages/studio/src/components/Header/AddressBar.tsx`: A temporary input to load composition URLs.

### Modify
- `packages/studio/src/App.tsx`: Integrate the `StudioProvider`, wire up the `helios-player` ref, and replace placeholders with new components.
- `packages/studio/src/components/Layout/StudioLayout.tsx`: Ensure slots accommodate the new components.

### Read-Only
- `packages/player/src/bridge.ts`
- `packages/player/src/index.ts`

## 3. Implementation Spec

### Architecture
- **State Management**: Lift state up to `StudioContext`. The Context will hold the `HeliosState` (frame, duration, fps, isPlaying) and the `Controller` instance.
- **Communication**: The `StudioBridge` (in `lib/bridge.ts`) will implement the parent-side of the Helios Bridge Protocol (`HELIOS_CONNECT`, `HELIOS_STATE`, etc.).
- **DOM Access**: `App.tsx` will use a `useRef` to access `<helios-player>`, traverse its `shadowRoot` to find the `<iframe>`, and attach the Controller.

### Pseudo-Code

#### `lib/bridge.ts`
```typescript
class StudioBridge {
  connect(iframe) {
    listen('message', handleMessage);
    send('HELIOS_CONNECT');
  }
  handleMessage(e) {
    if (e.data.type === 'HELIOS_STATE') callback(e.data.state);
  }
  play() { send('HELIOS_PLAY'); }
  seek(f) { send('HELIOS_SEEK', { frame: f }); }
}
```

#### `App.tsx`
```tsx
const playerRef = useRef(null);
const { setIframe } = useStudio();

useEffect(() => {
  if (playerRef.current) {
    const iframe = playerRef.current.shadowRoot.querySelector('iframe');
    setIframe(iframe);
  }
}, []);

// Render
<StudioLayout
   timeline={<Timeline />}
   // ...
/>
```

### Public API Changes
- None (internal Studio changes only).

### Dependencies
- No external dependencies.

## 4. Test Plan

### Verification
1.  **Start Studio**: `npx helios studio` (runs `npm run dev`).
2.  **Start Example**: In another terminal, run an example (e.g., `cd examples/react-composition && npx vite preview --port 4173`).
3.  **Load**: In Studio, enter `http://localhost:4173` into the Address Bar.
4.  **Interact**:
    - Click Play -> Video should play.
    - Drag Scrubber -> Video should seek.
    - Check Time Display -> Should update.

### Success Criteria
- Play/Pause toggles state.
- Scrubber moves with playback.
- Scrubber seeks video when dragged.
- Studio UI reflects the same state as the internal `helios-player` overlay.
