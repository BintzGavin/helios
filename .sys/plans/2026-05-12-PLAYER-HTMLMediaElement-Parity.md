### 1. Context & Goal
- **Objective**: Implement missing HTMLMediaElement properties (`disableRemotePlayback`, `mediaGroup`, `sinkId`) and method (`setSinkId`) on the `HeliosPlayer` Web Component.
- **Trigger**: I discovered these missing properties during a gap analysis between the `HeliosPlayer` interface and standard `HTMLMediaElement` properties.
- **Impact**: Improves API parity with `HTMLMediaElement`, ensuring third-party wrappers and libraries that interact with video elements can seamlessly interact with `<helios-player>`.

### 2. File Inventory
- **Create**: `.sys/plans/2026-05-12-PLAYER-HTMLMediaElement-Parity.md`
- **Modify**:
  - `packages/player/src/index.ts` (Implement the properties and methods)
  - `packages/player/src/api_parity.test.ts` (Add unit tests)
- **Read-Only**: `README.md` (To verify existing documented APIs)

### 3. Implementation Spec
- **Architecture**:
  - `disableRemotePlayback`: A boolean property. When set to true, it should add a `disableremoteplayback` attribute, and setting it to false should remove it.
  - `mediaGroup`: A string property. Acts as a simple getter/setter that modifies the `mediagroup` attribute on the custom element.
  - `sinkId`: A string property. Returns the current sink ID (defaults to empty string for default device).
  - `setSinkId(sinkId: string)`: A method returning a Promise that resolves immediately, saving the `sinkId` internally. Since `HeliosPlayer` is a Web Component and handles audio internally/via bridge differently from standard video elements, `setSinkId` will be a stub that stores the value but logs a warning that audio routing is not natively supported by the custom element.
- **Pseudo-Code**:
  - Add getters/setters for `disableRemotePlayback`, `mediaGroup`, and `sinkId` to the `HeliosPlayer` class.
  - Add the `setSinkId(sinkId: string)` method that returns a `Promise.resolve()`.
  - Add missing unit tests in `api_parity.test.ts`.
- **Public API Changes**:
  - Added properties: `disableRemotePlayback`, `mediaGroup`, `sinkId`
  - Added method: `setSinkId`
- **Dependencies**: None.

### 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**: All tests pass. `api_parity.test.ts` covers the new getters, setters, and method.
- **Edge Cases**: Setting `sinkId` explicitly to an invalid device ID should conceptually throw, but since we are polyfilling the interface, resolving the promise while storing the ID is sufficient for API parity tests.
