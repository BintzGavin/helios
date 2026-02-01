# Context & Goal
- **Objective**: Implement an "Audio Mixer" panel in the Studio Sidebar to visualize and control audio tracks (volume/mute) detected in the active composition.
- **Trigger**: Vision Gap. The README promises "Advanced audio mixing" (V1.x), but the current Studio only supports global volume control. The `HeliosController` API exposes per-track control, but the Studio UI lacks a surface for it.
- **Impact**: Unlocks the ability for users to balance audio levels of different elements (bgm, sfx, voiceover) directly in the Studio, moving closer to a full NLE experience.

# File Inventory
- **Create**:
  - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx`: The main panel component.
  - `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.css`: Styles for the mixer layout (sliders, buttons).
- **Modify**:
  - `packages/studio/src/components/Sidebar/Sidebar.tsx`: Add "Audio" tab and render the mixer panel.
- **Read-Only**:
  - `packages/player/src/controllers.ts`: Reference for `getAudioTracks` and control methods.

# Implementation Spec
- **Architecture**:
  - The `AudioMixerPanel` will act as a client to the `HeliosController`.
  - It will fetch the list of available audio tracks using `controller.getAudioTracks()` (which scrapes the DOM for `<audio>` tags).
  - It will maintain local state for the track list but push updates immediately via `controller.setAudioTrackVolume(id, vol)` and `controller.setAudioTrackMuted(id, muted)`.
  - To handle dynamic track changes (rare but possible), a "Refresh" button will be provided to re-invoke `getAudioTracks()`.
- **Public API Changes**: None.
- **Pseudo-Code**:
  ```tsx
  // AudioMixerPanel.tsx
  export const AudioMixerPanel = () => {
    const { controller } = useStudio();
    const [tracks, setTracks] = useState([]);

    // Fetch on mount
    useEffect(() => {
      controller.getAudioTracks().then(setTracks);
    }, [controller]);

    const updateVolume = (id, vol) => {
       controller.setAudioTrackVolume(id, vol);
       // update local state for slider
    }

    return (
      <div className="mixer">
        <Header>
          <Title>Audio Mixer</Title>
          <RefreshButton onClick={fetchTracks} />
        </Header>
        <List>
          {tracks.map(track => (
            <TrackRow>
               <Label>{track.id}</Label>
               <MuteToggle onClick={() => toggleMute(track.id)} />
               <VolumeSlider onChange={(v) => updateVolume(track.id, v)} />
            </TrackRow>
          ))}
        </List>
      </div>
    )
  }
  ```
- **Dependencies**: None. The `HeliosController` interface already supports the necessary methods.

# Test Plan
- **Verification**:
  - Run `npx helios studio` (or `npm run dev -w packages/studio`).
  - Load a composition that contains multiple `<audio>` tags (e.g., `examples/audio-mixing` if available, or create a test one).
  - Open the Sidebar and click the "Audio" tab.
  - Verify that all audio tracks are listed with correct IDs.
  - Move a volume slider and verify the audio level changes (or the command is sent).
  - Toggle mute and verify behavior.
- **Success Criteria**:
  - "Audio" tab appears in Sidebar.
  - Panel renders without errors.
  - Tracks are discovered and listed.
  - Controls map to controller methods.
- **Edge Cases**:
  - **No Tracks**: Should show a "No audio tracks found" empty state.
  - **No Controller**: Should show "Connect to Player..." message.
  - **Dynamic Updates**: If tracks are added via HMR, clicking "Refresh" should update the list.
