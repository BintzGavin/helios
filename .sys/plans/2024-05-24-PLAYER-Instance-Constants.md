#### 1. Context & Goal
- **Objective**: Implement missing `HTMLMediaElement` instance constant properties (`HAVE_NOTHING`, `NETWORK_EMPTY`, etc.) on `<helios-player>` and update documentation.
- **Trigger**: The constants are implemented as static on `HeliosPlayer`, but standard `HTMLMediaElement` exposes them on both the constructor and the instances. They are also missing from `README.md`.
- **Impact**: Achieves deeper `HTMLMediaElement` API parity, allowing developers to check `player.readyState === player.HAVE_ENOUGH_DATA`.

#### 2. File Inventory
- **Create**: (None)
- **Modify**:
  - `packages/player/src/index.ts`: Add instance getters for the 9 media constants.
  - `packages/player/src/api_parity.test.ts`: Add tests to verify constants exist on the player instance.
  - `packages/player/README.md`: Document the 9 constant properties.
- **Read-Only**: `packages/player/package.json`

#### 3. Implementation Spec
- **Architecture**: Standard Web Component API mapping. The constants will be exposed via instance getters returning the static readonly values on the `HeliosPlayer` class.
- **Pseudo-Code**:
  ```typescript
  public get HAVE_NOTHING() { return HeliosPlayer.HAVE_NOTHING; }
  public get HAVE_METADATA() { return HeliosPlayer.HAVE_METADATA; }
  // ... continue for HAVE_CURRENT_DATA, HAVE_FUTURE_DATA, HAVE_ENOUGH_DATA
  // ... continue for NETWORK_EMPTY, NETWORK_IDLE, NETWORK_LOADING, NETWORK_NO_SOURCE
  ```
- **Public API Changes**:
  - Adds 9 new readonly properties to the `<helios-player>` instance: `HAVE_NOTHING`, `HAVE_METADATA`, `HAVE_CURRENT_DATA`, `HAVE_FUTURE_DATA`, `HAVE_ENOUGH_DATA`, `NETWORK_EMPTY`, `NETWORK_IDLE`, `NETWORK_LOADING`, `NETWORK_NO_SOURCE`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All `api_parity.test.ts` pass, ensuring `player.HAVE_NOTHING === 0` and others are correctly exposed on the instance.
- **Edge Cases**: Ensure the constants remain strictly read-only on the instance.
