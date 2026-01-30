# 📋 PLAYER: Standard Media API - Fix load() Behavior

## 1. Context & Goal
- **Objective**: Update the `load()` method in `<helios-player>` to comply with the `HTMLMediaElement` specification by supporting the reloading of the current `src` resource, and utilize this robust method for internal retry logic.
- **Trigger**: The current implementation of `load()` is a no-op if no deferred `pendingSrc` exists (e.g., when `preload="auto"`), failing to support programmatic reloading or retries as documented.
- **Impact**: Enables users to programmatically reset the player or retry failed connections using the standard API, and ensures the internal "Retry" button performs a clean state reset.

## 2. File Inventory
- **Modify**: `packages/player/src/index.ts` (Update `load()` logic and `retryConnection`)
- **Modify**: `packages/player/src/api_parity.test.ts` (Add verification test for `load()` behavior)
- **Read-Only**: `packages/player/src/controllers.ts`

## 3. Implementation Spec
- **Architecture**: Update `HeliosPlayer` class methods to handle unconditional loading when `load()` is called.
- **Pseudo-Code**:
  ```typescript
  // in packages/player/src/index.ts

  public load(): void {
    const src = this.getAttribute("src");

    if (this.pendingSrc) {
       // Existing deferred load logic
       const s = this.pendingSrc;
       this.pendingSrc = null;
       this.loadIframe(s);
    } else if (src) {
       // NEW: Reload current source
       this.loadIframe(src);
    }
  }

  private retryConnection() {
      this.showStatus("Retrying...", false);
      // Use public load() to ensure proper lifecycle (state reset, controller disposal)
      this.load();
  }
  ```
- **Public API Changes**: `load()` method behavior updated to always trigger a load if `src` is present.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/player`
- **Success Criteria**:
  - New test case in `api_parity.test.ts` confirms `load()` triggers `loadstart` event and reloads the iframe when `src` is unchanged.
  - Existing `retryConnection` behavior is preserved (verified via manual review or existing tests if any).
- **Edge Cases**:
  - `load()` called without `src` attribute (should do nothing).
