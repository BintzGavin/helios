#### 1. Context & Goal
- **Objective**: Document the `getController` method and HTMLMediaElement Constants in the player's `README.md`.
- **Trigger**: Discovered that the `getController` method and standard `HAVE_*` and `NETWORK_*` constants are fully implemented in `index.ts` but missing from the public API documentation, creating a vision gap.
- **Impact**: Provides accurate documentation matching the true capabilities of the `HeliosPlayer` class, completing HTMLMediaElement API parity visibility.

#### 2. File Inventory
- **Create**: []
- **Modify**: [`packages/player/README.md` - Add missing method and a new Constants section]
- **Read-Only**: [`packages/player/src/index.ts`]

#### 3. Implementation Spec
- **Architecture**: Update public documentation to accurately reflect existing implemented behavior. No functional code changes required.
- **Pseudo-Code**:
  1. Add `- \`getController(): HeliosController | null\` - Returns the internal player controller instance.` under `### Methods`.
  2. Add a new `### Constants` section with definitions for all standard HTMLMediaElement `HAVE_*` and `NETWORK_*` state constants implemented in the class.
- **Public API Changes**: No code changes; only README updates.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player`
- **Success Criteria**: `packages/player/README.md` includes the `getController` method and the Constants section, and the build succeeds.
- **Edge Cases**: None.
