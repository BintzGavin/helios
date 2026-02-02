# Audio Fade Easing in DomDriver

#### 1. Context & Goal
- **Objective**: Implement support for non-linear audio fades (e.g., exponential, sine) in `DomDriver` using the existing `Easing` library.
- **Trigger**: The roadmap "Advanced audio mixing" requires better audio control. Current fades are strictly linear, which is unnatural for volume.
- **Impact**: Enables professional-quality audio fading in the Preview (DOM) environment.

#### 2. File Inventory
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Logic to parse `data-helios-fade-easing` and apply easing)
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts` (Tests for eased fades)
- **Read-Only**: `packages/core/src/easing.ts` (Reference for `Easing` functions)

#### 3. Implementation Spec
- **Architecture**:
  - `DomDriver` calculates `fadeInMultiplier` (0-1).
  - It will now read `data-helios-fade-easing` (e.g., "quad.in").
  - It will map this string to an `Easing` function from `../easing.js`.
  - It will apply the function: `multiplier = easing(multiplier)`.
- **Pseudo-Code**:
  ```typescript
  import { Easing } from '../easing.js';

  // Helper to resolve string "group.type" to function
  function resolveEasing(name) {
    const [group, type] = name.split('.');
    return Easing[group]?.[type] || Easing.linear;
  }

  // Inside syncMediaElements
  const fadeEasing = el.getAttribute('data-helios-fade-easing');
  let multiplier = ...; // linear calculation
  if (fadeEasing) {
     const fn = resolveEasing(fadeEasing);
     multiplier = fn(multiplier);
  }
  ```
- **Public API Changes**:
  - Supports `data-helios-fade-easing` attribute on `<audio>`/`<video>` elements.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - `DomDriver.test.ts` passes.
  - New test confirms `quad.in` at 0.5 progress results in 0.25 volume.
- **Edge Cases**:
  - Invalid easing string (fallback to linear).
  - "linear" string.
