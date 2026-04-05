#### 1. Context & Goal
- **Objective**: Implement standard J, K, L keyboard shortcuts for variable playback speed and reverse in Helios Studio.
- **Trigger**: The V1.x vision states Playback Controls should support 'variable speed playback (including reverse), and keyboard shortcuts', but J/K/L standard shortcuts are missing.
- **Impact**: Unlocks professional NLE-style workflow for users and completes the playback controls vision gap.

#### 2. File Inventory
- **Create**: None
- **Modify**: packages/studio/src/components/GlobalShortcuts.tsx (Add useKeyboardShortcut hooks for j, k, l)
- **Read-Only**: packages/studio/src/components/Controls/PlaybackControls.tsx (To understand existing playback state manipulation)

#### 3. Implementation Spec
- **Architecture**: Use existing `useKeyboardShortcut` hook to capture j, k, and l keystrokes. J will decrement playbackRate by steps (or to negative for reverse) and play. K will pause. L will increment playbackRate by steps and play.
- **Pseudo-Code**: On 'j': check current rate. If > 1, decrement. Else set to -1, -2 etc. On 'k': pause(). On 'l': check current rate. If < 1, set to 1. Else increment. Play.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run dev -w packages/studio` and use J, K, L keys.
- **Success Criteria**: Pressing L multiple times speeds up forward playback. Pressing J reverses playback. K pauses.
- **Edge Cases**: Ensure 'ignoreInput: true' is passed to `useKeyboardShortcut` so typing J/K/L in input fields doesn't trigger playback.
