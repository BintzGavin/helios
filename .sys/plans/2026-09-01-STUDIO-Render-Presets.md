# STUDIO: Render Presets & Persistence

## 1. Context & Goal
- **Objective**: Persist render settings (mode, bitrate, codec, concurrency) across sessions and provide common presets (Draft, HD, 4K) to simplify configuration.
- **Trigger**: Users currently lose settings on page reload and must manually input technical FFmpeg parameters (e.g., "libx264"), which is error-prone and tedious.
- **Impact**: Improves User/Agent Experience by ensuring a stable workspace and reducing friction in the export workflow.

## 2. File Inventory
- **Modify**: `packages/studio/src/context/StudioContext.tsx` (Add persistence logic, update interface)
- **Modify**: `packages/studio/src/components/RendersPanel/RenderConfig.tsx` (Add Presets dropdown, update UI)
- **Read-Only**: `packages/studio/src/components/RendersPanel/RendersPanel.tsx` (Consumer of config)

## 3. Implementation Spec

### Architecture
- **State Persistence**: Utilize `localStorage` to persist the `renderConfig` object in `StudioContext`. Load on initialization, save on change.
- **Presets Pattern**: Introduce a `RENDER_PRESETS` constant in `RenderConfig.tsx` defining common configurations. Selecting a preset applies its values to the current state.

### Type Changes
Update `RenderConfig` interface in `StudioContext.tsx`:
```typescript
export interface RenderConfig {
  mode: 'canvas' | 'dom';
  videoBitrate?: string;
  videoCodec?: string;
  concurrency?: number; // Added field
}
```

### Pseudo-Code

**StudioContext.tsx**:
```javascript
// On Mount
const savedConfig = localStorage.getItem('helios-studio:render-config');
const [renderConfig, setRenderConfig] = useState(savedConfig ? JSON.parse(savedConfig) : DEFAULT_CONFIG);

// On Change
useEffect(() => {
  localStorage.setItem('helios-studio:render-config', JSON.stringify(renderConfig));
}, [renderConfig]);
```

**RenderConfig.tsx**:
```javascript
const PRESETS = {
  'Custom': {},
  'Draft': { mode: 'canvas', concurrency: 4 },
  'HD (1080p)': { mode: 'canvas', videoBitrate: '5000k', videoCodec: 'libx264' },
  '4K (High Quality)': { mode: 'canvas', videoBitrate: '20000k', videoCodec: 'libx264' },
  'Transparent (WebM)': { mode: 'dom', videoCodec: 'libvpx-vp9' } // DOM often better for transparency accuracy
};

// UI
<select onChange={applyPreset}>
  <option>Custom</option>
  <option>Draft</option>
  ...
</select>
```

### Dependencies
- None.

## 4. Test Plan
- **Verification**:
  1. Run `npx helios studio`.
  2. Change render settings (e.g., set Bitrate to "1234k").
  3. Reload the page.
  4. Verify Bitrate is still "1234k".
  5. Select "HD (1080p)" preset.
  6. Verify Bitrate becomes "5000k" and Codec becomes "libx264".
- **Success Criteria**: Settings survive reload; Presets correctly populate fields.
- **Edge Cases**:
  - Malformed JSON in localStorage (should fallback to default).
  - Partial preset application (should merge or overwrite? Overwrite specific fields, keep others if undefined? Prefer overwrite for consistency).
