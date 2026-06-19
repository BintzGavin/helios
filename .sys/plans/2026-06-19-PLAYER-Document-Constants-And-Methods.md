#### 1. Context & Goal
- **Objective**: Document missing static constants (`HAVE_*`, `NETWORK_*`) and the `getController()` method in `README.md` to match the `HeliosPlayer` implementation.
- **Trigger**: Vision Gap - the `packages/player/src/index.ts` file implements several static readiness/network constants and a public `getController()` method which are not currently listed in `packages/player/README.md`.
- **Impact**: Improves API parity documentation, ensuring consumers know they can access the underlying `HeliosController` and the standard media constants directly from the `HeliosPlayer` class.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/README.md` (Add documentation for `HAVE_*`, `NETWORK_*` constants and the `getController()` method).
- **Read-Only**: `packages/player/src/index.ts` (To confirm the exact API members).

#### 3. Implementation Spec
- **Architecture**: Update Markdown documentation.
- **Pseudo-Code**:
  - Add a new "Static Properties" subsection under "API" in `README.md`.
  - Document `HAVE_NOTHING` (0), `HAVE_METADATA` (1), `HAVE_CURRENT_DATA` (2), `HAVE_FUTURE_DATA` (3), `HAVE_ENOUGH_DATA` (4).
  - Document `NETWORK_EMPTY` (0), `NETWORK_IDLE` (1), `NETWORK_LOADING` (2), `NETWORK_NO_SOURCE` (3).
  - Add `getController(): HeliosController | null` to the "Methods" list in `README.md`.
- **Public API Changes**: None (documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Successড়ার Criteria**: The build passes, and a visual inspection of `packages/player/README.md` confirms the new methods and constants are present and formatted correctly.
- **Edge Cases**: None.
