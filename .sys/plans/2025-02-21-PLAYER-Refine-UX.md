# Refine Player UX (Speed & Navigation)

## 1. Context & Goal
- **Objective**: Refine the `<helios-player>` UX by implementing granular playback speeds and standardizing keyboard navigation shortcuts to match industry norms.
- **Trigger**: Critical learnings identified that "Arrows = 1 frame" is frustratingly slow and playback speed options (0.25, 0.5, 1, 2) are too coarse.
- **Impact**: Improves the review experience ("Agent Experience" and Human) by providing expected navigation behaviors (5s/10s seek) and better speed control.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update HTML template and keyboard logic)
- **Modify**: `packages/player/src/index.test.ts` (Update keyboard interaction tests)
- **Read-Only**: `packages/player/src/controllers.ts` (Reference for API)

## 3. Implementation Spec

### Architecture
- **HTML Template**: The playback speed `<select>` element will be updated to include intermediate steps (`0.75`, `1.25`, `1.5`, `1.75`).
- **Input Handling**: The `handleKeydown` method will be refactored to prioritize time-based seeking (Seconds) over frame-based seeking for standard navigation keys.
- **Helper Method**: A private `seekRelativeSeconds(seconds: number)` helper will be added to abstract the `Frame = Seconds * FPS` calculation.

### Pseudo-Code
```typescript
// packages/player/src/index.ts

// 1. Update Template
<select class="speed-selector">
  <option value="0.25">0.25x</option>
  <option value="0.5">0.5x</option>
  <option value="0.75">0.75x</option> // NEW
  <option value="1" selected>1x</option>
  <option value="1.25">1.25x</option> // NEW
  <option value="1.5">1.5x</option>   // NEW
  <option value="1.75">1.75x</option> // NEW
  <option value="2">2x</option>
</select>

// 2. Add Helper
private seekRelativeSeconds(seconds: number) {
  if (!this.controller) return;
  const state = this.controller.getState();
  const frames = seconds * state.fps;
  this.seekRelative(frames); // Re-use existing frame seeker or inline logic
}

// 3. Update handleKeydown
switch (e.key) {
  case "ArrowRight":
    this.seekRelativeSeconds(e.shiftKey ? 10 : 5); // 5s default, 10s shift
    break;
  case "ArrowLeft":
    this.seekRelativeSeconds(e.shiftKey ? -10 : -5);
    break;
  case "l":
  case "L":
    this.seekRelativeSeconds(10);
    break;
  case "j":
  case "J":
    this.seekRelativeSeconds(-10);
    break;
  // Keep . and , for 1-frame seek
}
```

### Dependencies
- None.

## 4. Test Plan

### Verification
- Run unit tests: `npm test -w packages/player`

### Success Criteria
1.  **Playback Speed**: The UI dropdown contains the new options. (Implicitly verified by visual inspection or snapshot if exists, but mainly just code change).
2.  **Keyboard Shortcuts**:
    - `ArrowRight` triggers a seek of +5 seconds (e.g., +150 frames at 30fps).
    - `ArrowLeft` triggers a seek of -5 seconds.
    - `J` triggers -10 seconds.
    - `L` triggers +10 seconds.
    - `.` and `,` still trigger +/- 1 frame.

### Edge Cases
- **FPS 0/Undefined**: Ensure `seekRelativeSeconds` handles `fps=0` gracefully (should probably do nothing or assume 30? Better to do nothing).
- **Duration Bounds**: Seeking past 0 or Duration should clamp (existing `seekRelative` logic handles this).
