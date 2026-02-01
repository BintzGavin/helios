# Plan: Audio Mixer Panel

## 1. Context & Goal
- **Objective**: Implement an Audio Mixer Panel in the Studio Sidebar to enable per-track volume and mute control.
- **Trigger**: Vision gap in "Advanced audio mixing" (README V1.x) and user need for balancing audio assets.
- **Impact**: Unlocks the ability for users to mix audio levels for multiple tracks directly within the Studio, utilizing the underlying Player capabilities.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx`: The main panel component.
  - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.css`: Styles for the panel.
  - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.test.tsx`: Unit tests for the component.
- **Modify**:
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add "Audio" tab and render the panel.
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`: To access `controller`.

## 3. Implementation Spec
- **Architecture**:
  - The `AudioMixerPanel` will be a React functional component consumed by `Sidebar`.
  - It will access the `HeliosController` via `useStudio`.
  - It will fetch audio tracks using `controller.getAudioTracks()`.
  - Due to performance implications of `getAudioTracks` (fetching buffers), fetching will be triggered:
    - On component mount (initial load).
    - Manually via a "Refresh" button.
    - (NOT on a polling loop).
  - State management: Local `useState` for the list of tracks (`id`, `volume`, `muted`).
- **Pseudo-Code**:
  ```typescript
  interface AudioAsset { id: string; volume?: number; muted?: boolean; }

  Component AudioMixerPanel:
    const { controller } = useStudio()
    const [tracks, setTracks] = useState([])

    function fetchTracks():
      tracks = await controller.getAudioTracks()
      setTracks(tracks.map(t => ({ id: t.id, volume: t.volume, muted: t.muted })))

    useEffect(() => if controller then fetchTracks(), [controller])

    function setVolume(id, vol):
      controller.setAudioTrackVolume(id, vol)
      updateLocalState(id, { volume: vol })

    function toggleMute(id):
      controller.setAudioTrackMuted(id, !currentMuted)
      updateLocalState(id, { muted: !currentMuted })

    Render:
      Header: "Audio Mixer", Refresh Button
      List:
        Item(Track):
          Name (id)
          Mute Button (Toggle)
          Volume Slider (Input Range)
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Run `npx helios studio` (or `npm run dev` in `packages/studio`).
  - Open the new "Audio" tab in the Sidebar.
  - Verify "Audio Mixer" title and "Refresh" button appear.
  - If a composition with audio is loaded, verify tracks are listed.
  - Verify volume slider and mute button interactions update the state (optimistically) and call controller methods (mocked in unit test).
- **Success Criteria**:
  - Unit tests pass: `npx vitest run packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.test.tsx`.
  - Panel renders correctly in the Sidebar.
- **Edge Cases**:
  - No controller available (should show empty or loading).
  - No audio tracks found (should show "No audio tracks found").
  - `getAudioTracks` failure (should handle error gracefully).
