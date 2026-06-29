#### 1. Context & Goal
- **Objective**: Expose `setDuration`, `setFps`, `setSize`, and `setMarkers` methods on the public `HeliosPlayer` API wrapper.
- **Trigger**: Vision gap. The internal `HeliosController` has these features (implemented in v0.61.0), and the README documents them as "Dynamic Composition Updates", but they were omitted from the public `<helios-player>` Web Component interface.
- **Impact**: Unlocks dynamic composition updates from the host application (like Studio) without having to manually dig out the internal controller. Matches documented capabilities.

#### 2. File Inventory
- **Create**: []
- **Modify**:
  - `packages/player/src/index.ts` (Add the missing public methods)
- **Read-Only**:
  - `packages/player/src/controllers.ts` (Reference for method signatures)

#### 3. Implementation Spec
- **Architecture**: Standard Web Components API method forwarding. The `<helios-player>` class will simply forward these calls to its internal `HeliosController`.
- **Pseudo-Code**:
  ```typescript
  public setDuration(seconds: number): void {
    if (this.controller) this.controller.setDuration(seconds);
  }
  public setFps(fps: number): void {
    if (this.controller) this.controller.setFps(fps);
  }
  public setSize(width: number, height: number): void {
    if (this.controller) this.controller.setSize(width, height);
  }
  public setMarkers(markers: Marker[]): void {
    if (this.controller) this.controller.setMarkers(markers);
  }
  ```
- **Public API Changes**:
  - `setDuration(seconds: number): void` added to `HeliosPlayer`.
  - `setFps(fps: number): void` added to `HeliosPlayer`.
  - `setSize(width: number, height: number): void` added to `HeliosPlayer`.
  - `setMarkers(markers: Marker[]): void` added to `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run build -w packages/player && npm run test -w packages/player`
- **Success Criteria**: The code compiles and tests pass. A small check script can confirm the methods exist on the prototype.
- **Edge Cases**: The methods should safely no-op if the controller is not yet initialized.
