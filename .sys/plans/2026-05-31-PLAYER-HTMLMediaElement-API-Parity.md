#### 1. Context & Goal
- **Objective**: Implement missing HTMLMediaElement properties, methods, and event handlers to achieve full API parity.
- **Trigger**: The Vision Document (`README.md` and `packages/player/README.md`) states `<helios-player>` implements the HTMLMediaElement interface, but there are missing properties (`disableRemotePlayback`, `mediaGroup`, `sinkId`), methods (`setSinkId`), and event handlers (`onabort`, `onemptied`, `onencrypted`, `onplaying`, `onprogress`, `onstalled`, `onsuspend`, `onwaiting`).
- **Impact**: Ensures 100% compliance with HTMLMediaElement standard API, unlocking drop-in compatibility for developers migrating from native `<video>` elements.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.ts`, `packages/player/src/features/api_parity.test.ts`
- **Read-Only**: `packages/player/README.md`, `README.md`

#### 3. Implementation Spec
- **Architecture**: Web Component API parity via getter/setters and standard DOM event propagation.
- **Pseudo-Code**:
  1. Add private fields `_disableRemotePlayback`, `_mediaGroup`, `_sinkId`, and corresponding event handlers.
  2. Implement getters and setters for properties, dispatching relevant events or DOM attribute updates as necessary (e.g. `setSinkId` returning a Promise).
  3. Wire up standard events (`onabort`, `onplaying`, etc.) through `get`/`set` property accessors mapped to standard DOM Event listeners.
- **Public API Changes**: Adds `disableRemotePlayback`, `mediaGroup`, `sinkId`, `setSinkId()`, `onabort`, `onemptied`, `onencrypted`, `onplaying`, `onprogress`, `onstalled`, `onsuspend`, `onwaiting`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx vitest run packages/player/src/features/api_parity.test.ts`
- **Success Criteria**: All tests pass, and parity check tool reports zero missing standard properties.
- **Edge Cases**: `setSinkId` should return a Promise that resolves, and properties should accurately reflect their state.
