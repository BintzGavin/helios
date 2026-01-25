# 2026-01-25-PLAYER-Bridge-Documentation

#### 1. Context & Goal
- **Objective**: Improve the Developer Experience (DX) for `<helios-player>` by documenting the critical `connectToParent` bridge function and updating the player's error feedback.
- **Trigger**: The current "Drop-in" vision fails because the player expects a connection (`window.helios` or `postMessage`) that the user is not instructed to provide. The `connectToParent` helper exists but is undocumented and obscure.
- **Impact**: Enables users to actually use the player with the "Bridge Mode" (secure, cross-origin compatible), fulfilling the "Sandboxed" vision.

#### 2. File Inventory
- **Create**: `packages/player/README.md`
- **Modify**: `packages/player/src/index.ts`
- **Read-Only**: `packages/player/src/bridge.ts`

#### 3. Implementation Spec
- **Architecture**: Documentation update and error message refinement.
- **Pseudo-Code**:
   1. Create `packages/player/README.md`:
      - Add Title "Helios Player".
      - Add "Installation" section (`npm install @helios-project/player`).
      - Add "Usage" section for the Host page (Web Component).
      - Add **"Connecting the Composition"** section:
         - Show `import { connectToParent } from '@helios-project/player/bridge';`.
         - Show `connectToParent(helios);` usage.
      - Add "Attributes" table (`src`, `width`, `height`, `autoplay`, `loop`, `controls`, `export-mode`, `canvas-selector`).
      - Add "Client-Side Export" section explaining `export-mode`.
   2. Modify `packages/player/src/index.ts`:
      - In `handleIframeLoad`, find the timeout callback.
      - Update the error message string from `"Connection Failed. Check window.helios."` to `"Connection Failed. Ensure window.helios is set or connectToParent() is called."`
- **Public API Changes**: None (Documentation only).
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
   - Run `npm run build -w packages/player` to ensure no syntax errors.
   - Run `npm test -w packages/player` to ensure no regression.
- **Success Criteria**:
   - Build succeeds.
   - Tests pass.
   - `packages/player/README.md` exists and contains "connectToParent".
   - `packages/player/src/index.ts` contains the updated error string.
- **Edge Cases**: None (Text change only).
