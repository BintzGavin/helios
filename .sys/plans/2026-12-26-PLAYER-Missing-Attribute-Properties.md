#### 1. Context & Goal
- **Objective**: Expose missing properties (`exportMode`, `exportFormat`, `exportFilename`, `exportWidth`, `exportHeight`, `exportBitrate`, `exportCaptionMode`, `canvasSelector`, `controlsList`) on the `HeliosPlayer` class to match the documented attributes.
- **Trigger**: The README states that `<helios-player>` supports various `export-*`, `canvas-selector`, and `controlslist` attributes, but these are not exposed as JavaScript properties on the class, causing a gap in the API surface.
- **Impact**: Allows programmatic access and modification of these configuration options, improving parity with standard Web Component practices and making it easier for host applications to update configurations dynamically without relying on `setAttribute`/`getAttribute`.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/player/src/index.ts` - Add getters and setters for the missing properties that reflect their respective HTML attributes.
- **Read-Only**: `packages/player/README.md` (to verify attribute names)

#### 3. Implementation Spec
- **Architecture**: Standard Web Component attribute reflection. The getters will read the attribute (or return an empty string/null), and the setters will update or remove the attribute.
- **Pseudo-Code**:
  ```typescript
  public get exportMode(): string { return this.getAttribute("export-mode") || "auto"; }
  public set exportMode(val: string) { this.setAttribute("export-mode", val); }

  public get exportFormat(): string { return this.getAttribute("export-format") || "mp4"; }
  public set exportFormat(val: string) { this.setAttribute("export-format", val); }

  public get exportFilename(): string { return this.getAttribute("export-filename") || "video"; }
  public set exportFilename(val: string) { this.setAttribute("export-filename", val); }

  public get exportCaptionMode(): string { return this.getAttribute("export-caption-mode") || "burn-in"; }
  public set exportCaptionMode(val: string) { this.setAttribute("export-caption-mode", val); }

  public get exportWidth(): number | null {
      const val = this.getAttribute("export-width");
      return val ? parseInt(val, 10) : null;
  }
  public set exportWidth(val: number | null) {
      if (val === null) this.removeAttribute("export-width");
      else this.setAttribute("export-width", val.toString());
  }

  public get exportHeight(): number | null {
      const val = this.getAttribute("export-height");
      return val ? parseInt(val, 10) : null;
  }
  public set exportHeight(val: number | null) {
      if (val === null) this.removeAttribute("export-height");
      else this.setAttribute("export-height", val.toString());
  }

  public get exportBitrate(): number | null {
      const val = this.getAttribute("export-bitrate");
      return val ? parseInt(val, 10) : null;
  }
  public set exportBitrate(val: number | null) {
      if (val === null) this.removeAttribute("export-bitrate");
      else this.setAttribute("export-bitrate", val.toString());
  }

  public get canvasSelector(): string { return this.getAttribute("canvas-selector") || "canvas"; }
  public set canvasSelector(val: string) { this.setAttribute("canvas-selector", val); }

  public get controlsList(): string { return this.getAttribute("controlslist") || ""; }
  public set controlsList(val: string) { this.setAttribute("controlslist", val); }
  ```
- **Public API Changes**: Adds `exportMode`, `exportFormat`, `exportFilename`, `exportWidth`, `exportHeight`, `exportBitrate`, `exportCaptionMode`, `canvasSelector`, and `controlsList` properties to `HeliosPlayer`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm run test -w packages/player`
- **Success Criteria**: All tests pass, ensuring that exposing these properties does not break existing functionality. New properties can be verified manually or by adding unit tests in the execution phase.
- **Edge Cases**: Setting numeric properties to null should remove the attribute.
