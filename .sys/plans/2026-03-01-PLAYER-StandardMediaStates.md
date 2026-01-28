#### 1. Context & Goal
- **Objective**: Implement `readyState` and `networkState` properties and associated lifecycle events (`loadstart`, `loadedmetadata`, `canplay`, etc.) in `<helios-player>`.
- **Trigger**: Vision gap - "Standard Media API" parity is incomplete without these loading states, limiting compatibility with external video libraries.
- **Impact**: Improves robustness and "drop-in" compatibility; enables developers/agents to programmatically check if the player is ready.

#### 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Add constants, state logic, event dispatching)
- **Modify**: `packages/player/src/index.test.ts` (Add tests for new states and events)

#### 3. Implementation Spec
- **Architecture**:
  - Implement `HTMLMediaElement` loading state constants and properties.
  - Map `HeliosPlayer` lifecycle (iframe load -> connection -> ready) to standard media states.
- **Pseudo-Code**:
  - Add static constants: `HAVE_NOTHING` (0), `HAVE_METADATA` (1), `HAVE_CURRENT_DATA` (2), `HAVE_FUTURE_DATA` (3), `HAVE_ENOUGH_DATA` (4).
  - Add static constants: `NETWORK_EMPTY` (0), `NETWORK_IDLE` (1), `NETWORK_LOADING` (2), `NETWORK_NO_SOURCE` (3).
  - Add private properties `_readyState` (init 0) and `_networkState` (init 0).
  - Add getters `readyState` and `networkState` returning private values.
  - In `loadIframe(src)`:
    - Set `_networkState = NETWORK_LOADING`.
    - Set `_readyState = HAVE_NOTHING`.
    - Dispatch `loadstart` event.
  - In `setController(controller)` (on successful connection):
    - Set `_networkState = NETWORK_IDLE`.
    - Set `_readyState = HAVE_ENOUGH_DATA`.
    - Dispatch `loadedmetadata` event.
    - Dispatch `loadeddata` event.
    - Dispatch `canplay` event.
    - Dispatch `canplaythrough` event.
- **Public API Changes**:
  - New Read-only Properties: `readyState`, `networkState`.
  - New Static Constants on `HeliosPlayer` class.
  - New Events Dispatched: `loadstart`, `loadedmetadata`, `loadeddata`, `canplay`, `canplaythrough`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test packages/player/src/index.test.ts`
- **Success Criteria**:
  - `readyState` is 0 initially.
  - `networkState` becomes 2 (LOADING) when `src` is set.
  - `readyState` becomes 4 (HAVE_ENOUGH_DATA) when controller connects.
  - Events fire in order: `loadstart` -> `loadedmetadata` -> `canplay`.
- **Edge Cases**:
  - Changing `src` resets states correctly.
