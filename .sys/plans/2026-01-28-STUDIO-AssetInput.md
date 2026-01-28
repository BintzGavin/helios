#### 1. Context & Goal
- **Objective**: Implement `AssetInput` in the Props Editor to allow selecting project assets (images, videos, audio, fonts) directly from the properties panel.
- **Trigger**: The Props Editor currently lacks dedicated inputs for asset types defined in the Core schema (`image`, `video`, `audio`, `font`), falling back to basic text inputs or unsupported messages. This creates friction when trying to use assets managed by the Assets Panel.
- **Impact**: Improves the WYSIWYG experience by linking the Assets discovery system with the Props editing system, enabling a more fluid workflow.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx`
- **Read-Only**:
  - `packages/studio/src/context/StudioContext.tsx`
  - `packages/core/src/schema.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Enhance `SchemaInputs.tsx` by introducing a new `AssetInput` component.
  - `AssetInput` will consume `useStudio` to access the discovered `assets` list (which comes from `/api/assets`).
  - It will filter the global assets list based on the prop type (e.g., only show images for `type: 'image'`).
  - It will render a native `<input>` paired with a `<datalist>` (using the `list` attribute) to allow both selecting existing assets and typing custom URLs (e.g., external links).
- **Pseudo-Code**:
  ```typescript
  import { useStudio } from '../context/StudioContext';

  // New component to handle asset selection
  const AssetInput = ({ type, value, onChange }) => {
    const { assets } = useStudio();
    // Use React.useId() to generate a unique ID for the datalist linkage
    const id = React.useId();

    // Filter assets: match specific type or allow 'other' if needed?
    // Strict matching is safer for now.
    const filteredAssets = assets.filter(a => a.type === type);

    return (
      <>
        <input
          list={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="prop-input"
          placeholder="Select asset or type URL..."
        />
        <datalist id={id}>
          {filteredAssets.map(a => (
            <option key={a.id} value={a.url}>
              {a.name}
            </option>
          ))}
        </datalist>
      </>
    )
  }

  // In SchemaInput component:
  export const SchemaInput: React.FC<SchemaInputProps> = ({ definition, value, onChange }) => {
    // ... existing enum check

    switch (definition.type) {
      // ... existing cases
      case 'image':
      case 'video':
      case 'audio':
      case 'font':
        return <AssetInput type={definition.type} value={value} onChange={onChange} />;
      // ... existing default
    }
  }
  ```
- **Public API Changes**: None. Internal component update only.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  1. Run `npm test` in `packages/studio` to ensure no regressions in existing UI tests.
  2. Run `npx helios studio` to launch the development server.
  3. Create or open a composition that defines props with types `image`, `video`, `audio`, or `font`.
  4. Verify that the Props Editor renders a text input with a dropdown arrow (or suggestions when typing) for these props.
  5. Verify that the suggestions list contains assets of the matching type from the Assets Panel.
  6. Select an asset and verify the prop value updates to the asset's URL.
  7. Type a custom URL and verify the prop value updates accordingly.
- **Success Criteria**: The Props Editor allows selecting assets from the project for `image`, `video`, `audio`, and `font` types via a datalist interface.
- **Edge Cases**:
  - No assets available for the type (datalist should be empty, input still works).
  - Asset name contains special characters (should render correctly in option).
  - Custom URL that doesn't match any asset (should be accepted).
