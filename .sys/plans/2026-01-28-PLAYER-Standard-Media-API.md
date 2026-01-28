# Plan: Implement Standard Media API Properties

#### 1. Context & Goal
- **Objective**: Implement standard `HTMLMediaElement` properties (`src`, `autoplay`, `loop`, `controls`, `poster`, `preload`, `width`, `height`) on the `HeliosPlayer` class to match `HTMLMediaElement` interface and improve developer experience.
- **Trigger**: Missing property reflection for standard attributes, requiring developers to use `setAttribute` which breaks standard patterns and expectations.
- **Impact**: Enhances Agent Experience (AX) and Developer Experience (DX) by making the player behave like a standard `<video>` element, facilitating integration with frameworks and tools that rely on property setting.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts`
  - Implement getters and setters for the target properties.
- **Modify**: `packages/player/src/index.test.ts`
  - Add test cases to verify property-to-attribute reflection and vice versa.

#### 3. Implementation Spec
- **Architecture**: Use standard Web Component property reflection pattern. Getters read from `getAttribute` (with type conversion), Setters write to `setAttribute` or `removeAttribute`.
- **Public API Changes**:
  - `get/set src`: string (reflects `src`)
  - `get/set autoplay`: boolean (reflects `autoplay`)
  - `get/set loop`: boolean (reflects `loop`)
  - `get/set controls`: boolean (reflects `controls`)
  - `get/set poster`: string (reflects `poster`)
  - `get/set preload`: string (reflects `preload`, defaults to "auto" if missing, usually just return attribute value)
  - `get/set width`: number (reflects `width`, parse as float/int)
  - `get/set height`: number (reflects `height`, parse as float/int)
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player`
- **Success Criteria**:
  - New tests in `index.test.ts` pass.
  - Setting `player.src = '...'` updates the attribute and triggers load logic (via existing `attributeChangedCallback`).
  - Setting `player.loop = true` sets the `loop` attribute.
  - Setting `player.controls = false` removes the `controls` attribute.
- **Edge Cases**:
  - Setting `width`/`height` as strings vs numbers (JS allows this, setter should handle or let attribute logic handle it).
  - Removing attributes via property (e.g. `player.loop = false`).
