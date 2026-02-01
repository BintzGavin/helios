# 2026-06-10-CORE-audio-track-discovery.md

#### 1. Context & Goal
- **Objective**: Implement automatic discovery of audio tracks (`data-helios-track-id`) via `DomDriver` and expose them in `Helios` state.
- **Trigger**: Vision gap - "Advanced audio mixing" requires knowing which tracks exist to build a dynamic mixer UI, but `Helios` currently only knows about tracks that have been explicitly controlled by the user.
- **Impact**: Enables `packages/studio` and other consumers to list available audio tracks dynamically discovered from the DOM, allowing for a "Native Always Wins" approach to audio management.

#### 2. File Inventory
- **Modify**: `packages/core/src/drivers/TimeDriver.ts` (Add `subscribeToMetadata` to interface)
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Implement track discovery and emission)
- **Modify**: `packages/core/src/Helios.ts` (Add `availableAudioTracks` signal, subscribe to driver)
- **Modify**: `packages/core/src/index.ts` (Ensure types are exported if needed)
- **ReadOnly**: `packages/core/src/drivers/NoopDriver.ts`, `packages/core/src/drivers/WaapiDriver.ts` (Optional method, no change strictly needed but good to know)

#### 3. Implementation Spec
- **Architecture**:
    - **Observer Pattern**: The Driver pushes metadata updates to `Helios` via a subscription model.
    - **Interface Change**: Add `subscribeToMetadata(callback: (meta: DriverMetadata) => void): () => void` to `TimeDriver` interface. This method is **optional** (`?`) to ensure backward compatibility with custom drivers (e.g., in `packages/renderer`).
    - **State Management**: `Helios` maintains a read-only signal `availableAudioTracks` reflecting the current reality of the DOM.

- **Pseudo-Code**:
    - **TimeDriver Interface**:
      ```typescript
      export interface DriverMetadata {
        audioTracks?: string[];
      }
      export interface TimeDriver {
        // ... existing methods
        subscribeToMetadata?(callback: (meta: DriverMetadata) => void): () => void;
      }
      ```
    - **DomDriver**:
      - Add `private discoveredTracks = new Set<string>()`.
      - Add `private metadataSubscribers = new Set<(meta: DriverMetadata) => void>()`.
      - In `scanAndAdd(node)`:
        - Check `el.getAttribute('data-helios-track-id')`.
        - If found, add to `discoveredTracks`.
        - If set changed, `emitMetadata()`.
      - In `scanAndRemove(node)`:
        - Check `el.getAttribute('data-helios-track-id')`.
        - If found, remove from `discoveredTracks` (only if no other element uses it? Note: `Set` stores unique IDs. If multiple elements have same ID, removing one shouldn't remove the ID if others exist. Logic needs to handle reference counting or full rescan. **Decision**: For simplicity and robustness, `DomDriver` can re-evaluate the set of IDs from `this.mediaElements` when a removal happens, or maintain a map of `ID -> count`. Given `mediaElements` is a Set of elements, iterating it to rebuild the ID set is O(N) where N is number of media elements. This is efficient enough for DOM updates.)
      - `emitMetadata()`: Call all subscribers with `{ audioTracks: Array.from(this.discoveredTracks) }`.
    - **Helios**:
      - Add `private _availableAudioTracks = signal<string[]>([])`.
      - Add getter `public get availableAudioTracks(): ReadonlySignal<string[]>`.
      - In `constructor` (after driver init):
        - `if (this.driver.subscribeToMetadata) { this.driver.subscribeToMetadata(meta => { if (meta.audioTracks) this._availableAudioTracks.value = meta.audioTracks; }); }`
      - In `dispose`: Unsubscribe.

- **Public API Changes**:
    - `Helios` class: New property `availableAudioTracks` (ReadonlySignal<string[]>).
    - `TimeDriver` interface: New optional method `subscribeToMetadata`.
    - Export `DriverMetadata` interface.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
    - **Unit Test (`DomDriver.test.ts`)**:
      - Create `DomDriver`.
      - Subscribe to metadata.
      - Add `<audio data-helios-track-id="bgm">` to scope.
      - Verify callback receives `["bgm"]`.
      - Add `<audio data-helios-track-id="sfx">`.
      - Verify callback receives `["bgm", "sfx"]`.
      - Remove "bgm" element.
      - Verify callback receives `["sfx"]`.
    - **Integration Test (`Helios.test.ts`)**:
      - Instantiate `Helios` with `DomDriver`.
      - Add elements to DOM.
      - Verify `helios.availableAudioTracks.value` updates.
- **Edge Cases**:
    - Duplicate IDs: Should appear once in the list.
    - Removing one of two elements with same ID: ID should remain in list. (Requires efficient counting or re-scan).
    - `NoopDriver`: Should not crash, signal remains empty.
