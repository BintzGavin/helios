# Context & Goal
- **Objective**: Update `examples/animation-helpers` to demonstrate `sequence` and `series` core functions.
- **Trigger**: The README lists `Sequence` and `Series` as key features ("Built-in components"), and they are implemented in `packages/core`, but the current `animation-helpers` example only shows `interpolate` and `spring`.
- **Impact**: Closes the gap between the vision of "rich animation primitives" and the reality of the examples, providing developers with a reference for sequencing animations without a framework.

# File Inventory
- **Modify**: `examples/animation-helpers/composition.html` (Add imports and logic for `sequence` and `series`).
- **Read-Only**: `packages/core/src/sequencing.ts` (Reference for API).

# Implementation Spec
- **Architecture**:
    -   The example uses a Vanilla JS Canvas approach.
    -   We will define a "series" of 3 sequential animations (e.g., "Phase 1", "Phase 2", "Phase 3").
    -   Use `series()` to calculate the start frames for these steps.
    -   Inside the render loop, iterate through the series items.
    -   Use `sequence()` to check if each item is active and get its local progress (0-1).
    -   Render visual feedback (e.g., a colored bar or text) based on the active sequence step.
- **Pseudo-Code**:
    ```javascript
    import { Helios, interpolate, spring, sequence, series } from '../../packages/core/dist/index.js';

    // Define sequence steps
    const steps = [
      { name: 'Phase 1: Grow', durationInFrames: 30, color: 'crimson' },
      { name: 'Phase 2: Hold', durationInFrames: 60, color: 'teal' },
      { name: 'Phase 3: Shrink', durationInFrames: 30, color: 'gold' }
    ];

    // Calculate start times automatically
    // series() adds a 'from' property to each item
    const timeline = series(steps);

    function draw(frame) {
      // ... existing interpolate/spring code ...

      // Draw Sequence Demo (e.g. at the bottom of the screen)
      timeline.forEach((step, index) => {
        const seq = sequence({
          frame,
          from: step.from,
          durationInFrames: step.durationInFrames
        });

        // Always draw the "slot" for the step
        const x = 50 + (index * 150);
        const y = 300;

        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, 140, 50);

        if (seq.isActive) {
           // Highlight active step
           ctx.fillStyle = step.color;
           // Fill based on progress
           ctx.fillRect(x, y, 140 * seq.progress, 50);

           ctx.fillStyle = '#fff';
           ctx.fillText(step.name, x + 70, y + 30);
        } else {
           ctx.fillStyle = '#666';
           ctx.fillText(step.name, x + 70, y + 30);
        }
      });
    }
    ```
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**:
    1.  Run `npm run build:examples` to ensure no compilation errors.
    2.  Run `npx ts-node tests/e2e/verify-render.ts` to generate the video verification.
- **Success Criteria**:
    -   The build completes successfully.
    -   The `verify-render` script passes for the `Helpers` case.
    -   (Visual Check) The output video for `animation-helpers` contains the new sequenced animation elements.
- **Edge Cases**:
    -   Frame 0 handling.
    -   Frames beyond the sequence duration.
