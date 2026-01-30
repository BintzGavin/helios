# Context & Goal
- **Objective**: Upgrade `PropsEditor` to support recursive schema validation for `object` and `array` types, replacing the raw JSON fallback with a nested UI.
- **Trigger**: Vision Gap - "Props Editor - Live editing... with schema validation" vs Reality (JSON text blob for complex types).
- **Impact**: Enables non-technical users to edit complex composition props (lists, nested configs) safely and easily.

# File Inventory
- **Modify**: `packages/studio/src/components/SchemaInputs.tsx`
  - Implement `ObjectInput` component.
  - Implement `ArrayInput` component.
  - Update `SchemaInput` to use these new components.
- **Modify**: `packages/studio/src/components/PropsEditor.css`
  - Add styles for nested indentation, collapsible sections, and array controls.
- **Modify**: `packages/studio/src/components/PropsEditor.test.tsx`
  - Add tests for nested object rendering.
  - Add tests for array rendering and manipulation (add/remove).
- **Read-Only**: `packages/studio/src/components/PropsEditor.tsx`

# Implementation Spec
- **Architecture**:
  - Recursive Component Pattern: `SchemaInput` -> `ObjectInput`/`ArrayInput` -> `SchemaInput`.
  - Use `StudioContext` or local state for updates, propagating changes up the tree.
- **Pseudo-Code**:
  ```typescript
  // ObjectInput
  const ObjectInput = ({ definition, value, onChange }) => {
    // Handle null/undefined value by initializing empty object
    const safeValue = value || {};
    return (
      <div className="prop-object">
        {Object.entries(definition.properties).map(([key, propDef]) => (
          <div key={key} className="prop-row nested">
             <label>{propDef.label || key}</label>
             <SchemaInput
               definition={propDef}
               value={safeValue[key]}
               onChange={newVal => onChange({...safeValue, [key]: newVal})}
             />
          </div>
        ))}
      </div>
    )
  }

  // ArrayInput
  const ArrayInput = ({ definition, value, onChange }) => {
     const safeValue = value || [];
     const handleAdd = () => {
         // Determine default value based on definition.items.type
         const defaultVal = getDefault(definition.items);
         onChange([...safeValue, defaultVal]);
     }
     return (
       <div className="prop-array">
         {safeValue.map((item, idx) => (
            <div key={idx} className="prop-array-item">
               <SchemaInput
                  definition={definition.items}
                  value={item}
                  onChange={newVal => {
                      const copy = [...safeValue];
                      copy[idx] = newVal;
                      onChange(copy);
                  }}
               />
               <button onClick={() => remove(idx)}>Remove</button>
            </div>
         ))}
         <button onClick={handleAdd}>Add Item</button>
       </div>
     )
  }
  ```
- **Public API Changes**: None. Internal component changes only.
- **Dependencies**: None.

# Test Plan
- **Verification**:
  - Run `npm test -w packages/studio` to verify new unit tests.
  - Run `npx helios studio` and inspect a composition with nested props.
- **Success Criteria**:
  - Unit tests for `ObjectInput` and `ArrayInput` pass.
  - UI renders nested forms instead of JSON text areas when schema is present.
- **Edge Cases**:
  - Deep recursion (should work but CSS might need max-depth handling).
  - Empty objects/arrays.
  - Undefined values initializing correctly.
