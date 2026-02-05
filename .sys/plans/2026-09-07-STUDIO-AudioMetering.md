# 📋 STUDIO: Audio Metering Visualization

## 1. Context & Goal
- **Objective**: Implement real-time audio metering (VU meters) in the Studio's Audio Mixer Panel by consuming the Player's metering API.
- **Trigger**: The current Audio Mixer allows volume control but provides no visual feedback on levels, leaving users "blind" when mixing.
- **Impact**: Improves the WYSIWYG editing experience by allowing precise audio balancing and clipping detection.

## 2. File Inventory
- **Create**: `packages/studio/src/components/AudioMixerPanel/AudioMeter.tsx` (New component for visualizing L/R levels)
- **Modify**: `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.tsx` (Integrate metering logic and render meters)
- **Modify**: `packages/studio/src/components/AudioMixerPanel/AudioMixerPanel.css` (Styling for meters)

## 3. Implementation Spec
- **Architecture**:
  - The `AudioMixerPanel` will act as the orchestrator. On mount, it will invoke `controller.startAudioMetering()` to enable the data stream from the Player.
  - It will listen for the `audiometering` event from the `controller`.
  - To ensure 60fps performance without React render thrashing, the panel will pass refs to `AudioMeter` components and update their DOM/CSS variables directly in the event handler.
  - The `AudioMeter` component will visualize Stereo RMS and Peak levels (if available) or fallback to Mono.

- **Pseudo-Code**:
  ```typescript
  // AudioMixerPanel.tsx
  useEffect(() => {
    if (!controller) return;

    // Enable metering in Player
    (controller as any).startAudioMetering?.();

    const handleLevels = (e: any) => {
       const levels = e.detail || e.data?.levels; // Support Event or Message
       if (levels) {
         // Update meters directly via refs
         Object.entries(levels).forEach(([id, level]) => {
           updateMeterRef(id, level);
         });
       }
    };

    // Listen for events
    controller.addEventListener?.('audiometering', handleLevels);
    // Fallback: window message if bridge is used directly
    window.addEventListener('message', handleLevels);

    return () => {
       (controller as any).stopAudioMetering?.();
       controller.removeEventListener?.('audiometering', handleLevels);
       window.removeEventListener('message', handleLevels);
    };
  }, [controller]);
  ```

- **Dependencies**:
  - Requires `packages/player` (already implemented per status).

## 4. Test Plan
- **Verification**:
  - Launch Studio: `npx helios studio`
  - Load a composition with multiple audio tracks.
  - Open the **Audio** panel in the Sidebar.
  - Play the composition.
  - Verify that green/yellow/red bars move in sync with the audio for each track.
  - Verify that Muting a track stops its meter (if Player logic supports it) or that it continues (depending on Pre/Post fader implementation).
- **Success Criteria**: Meters animate in real-time.
- **Edge Cases**:
  - No audio tracks.
  - Switching compositions.
  - HMR reload.
