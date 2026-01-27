# STUDIO: Implement Schema-Aware Props Editor

## 1. Context & Goal
- **Objective**: Implement a schema-aware Props Editor in Helios Studio that utilizes `HeliosSchema` to render appropriate input controls (sliders, color pickers, selects) and perform validation.
- **Trigger**: Vision gap identified in README: "Props Editor - Live editing of composition input props with **schema validation**". Currently, the editor relies solely on type inference from values.
- **Impact**: Improves the Developer Experience (DX) by generating intuitive forms for composition props, enforcing constraints (min/max, enums), and preventing invalid input errors. This prepares the Studio UI to consume schemas once they are exposed by the Player/Core.

## 2. File Inventory
- **Create**:
  - `packages/studio/src/components/SchemaInputs.tsx`
  - `packages/studio/src/components/PropsEditor.test.tsx`
- **Modify**:
  - `packages/studio/src/context/StudioContext.tsx`
  - `packages/studio/src/components/PropsEditor.tsx`
- **Read-Only**:
  - `packages/core/src/schema.ts` (To understand HeliosSchema type)

## 3. Implementation Spec
- **Architecture**:
  - **State**: The `schema` will be typed in `PlayerState` (imported from `@helios-project/core`).
  - **Component Composition**: `PropsEditor` acts as a dispatcher. It iterates keys of `inputProps`. If `schema[key]` exists, it delegates to `<SchemaInput>` (which wraps specialized inputs). Otherwise, it delegates to legacy `<PropInput>`.
  - **Pattern**: Composition over Inheritance. Specialized inputs (`EnumInput`, `NumberRangeInput`) are functional components that accept `value`, `onChange`, and `PropDefinition`.

- **Pseudo-Code**:
  ```typescript
  // In PropsEditor.tsx
  function PropsEditor() {
    const { schema, inputProps } = useStudio().playerState;

    return (
      <div>
        {Object.keys(inputProps).map(key => {
          if (schema && schema[key]) {
            return <SchemaInput definition={schema[key]} value={inputProps[key]} onChange={...} />
          } else {
            return <PropInput value={inputProps[key]} onChange={...} />
          }
        })}
      </div>
    )
  }

  // In SchemaInputs.tsx
  function SchemaInput({ definition, value, onChange }) {
    if (definition.enum) return <EnumInput options={definition.enum} ... />
    switch (definition.type) {
      case 'number': return <NumberRangeInput min={definition.minimum} max={definition.maximum} ... />
      case 'boolean': return <BooleanInput ... />
      case 'color': return <ColorInput ... />
      default: return <StringInput ... />
    }
  }
  ```

- **Public API Changes**:
  - None (Internal Studio UI only).

- **Dependencies**:
  - Requires `HeliosSchema` and `PropDefinition` exported from `@helios-project/core`.
  - **Note**: The full end-to-end feature depends on `HeliosController` exposing the schema (Task for Player/Core agents). However, this plan implements the UI support so it is ready when the data becomes available. We will verify using mocks in tests.

## 4. Test Plan
- **Verification**: Run `npx vitest packages/studio/src/components/PropsEditor.test.tsx`.
- **Success Criteria**:
  - Tests pass confirming that:
    - Schema with `enum` renders a `<select>`.
    - Schema with `number` + `min/max` renders a range slider.
    - Schema with `description` renders a title/tooltip.
    - Changing values calls `setInputProps` correctly.
- **Edge Cases**:
  - Missing schema (should fallback).
  - Prop exists in `inputProps` but not in `schema` (should fallback).
  - Schema present but prop missing (should handle gracefully).
- **Pre-Commit**: Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
