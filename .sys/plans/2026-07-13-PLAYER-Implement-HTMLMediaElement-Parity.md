#### 1. Context & Goal
- **Objective**: Implement the missing `remote` property to complete HTMLMediaElement parity.
- **Trigger**: Vision gap. The `HeliosPlayer` element is missing the `remote` standard media property that is present in `HTMLMediaElement` to control the Remote Playback API.
- **Impact**: Improves the `<helios-player>` Web Component's compliance with the `HTMLMediaElement` specification, offering a more familiar API for users integrating the component.

#### 2. File Inventory
- **Create**: None
- **Modify**:
  - `packages/player/src/index.ts`: Add `remote` property to the `HeliosPlayer` class.
  - `packages/player/README.md`: Document the new `remote` property.
- **Read-Only**: None

#### 3. Implementation Spec
- **Architecture**: Web Components API with standard DOM property reflection.
- **Pseudo-Code**:
  - Add `_remote` internal property to `HeliosPlayer` initializing a mock `RemotePlayback` object (similar to how unsupported API features are handled, since Helios doesn't natively support casting).
  - Add getter for `remote` returning this object.
  - Update the README to list `remote` under `Properties`.
- **Public API Changes**:
  - Added `remote` property (RemotePlayback).
- **Dependencies**: None

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**: The `remote` property is present on the `HeliosPlayer` class and documented in `README.md`.
- **Edge Cases**: Ensure the getter returns a consistent object.
