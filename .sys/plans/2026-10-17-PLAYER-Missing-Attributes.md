# Plan: Add Missing Attributes to observedAttributes

#### 1. Context & Goal
- **Objective**: Add `disableremoteplayback`, `mediagroup`, and `autopictureinpicture` to `observedAttributes` array in `HeliosPlayer`.
- **Trigger**: The HTMLMediaElement interface specifies several attributes that the player currently implements as properties but fails to observe their changes.
- **Impact**: Improved API parity with HTMLMediaElement specifications, ensuring that programmatic changes to attributes accurately reflect in properties.

#### 2. File Inventory
- **Create**: []
- **Modify**: [packages/player/src/index.ts]
- **Read-Only**: []

#### 3. Implementation Spec
- **Architecture**: Append the `disableremoteplayback`, `mediagroup`, and `autopictureinpicture` attributes to the array returned by the static `observedAttributes` getter on the `HeliosPlayer` class. This ensures the component receives `attributeChangedCallback` events.
- **Pseudo-Code**:
  1. Identify `static get observedAttributes()` in `packages/player/src/index.ts`.
  2. Append `"disableremoteplayback"`, `"mediagroup"`, and `"autopictureinpicture"` to the returned array.
- **Public API Changes**: None
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**: Web Component successfully compiles and the missing attributes are now observed by the component.
- **Edge Cases**: None
