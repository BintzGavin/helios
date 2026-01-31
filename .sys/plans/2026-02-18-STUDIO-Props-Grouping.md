# 2026-02-18-STUDIO-Props-Grouping.md

#### 1. Context & Goal
- **Objective**: Update the Studio Props Editor to respect the `group` property in `HeliosSchema`, organizing inputs into collapsible sections.
- **Trigger**: Vision gap. The Core schema supports `group`, but Studio currently ignores it, resulting in a flat list that is difficult to manage for complex compositions.
- **Impact**: Significantly improves User Experience (UX) for compositions with many input props by categorizing them logically.

#### 2. File Inventory
- **Modify**: `packages/studio/src/components/PropsEditor.tsx` (Implement grouping logic and UI structure)
- **Modify**: `packages/studio/src/components/PropsEditor.css` (Add styles for group headers and content areas)
- **Modify**: `packages/studio/src/components/PropsEditor.test.tsx` (Add unit tests for grouping logic)
- **Read-Only**: `packages/core/src/schema.ts` (Reference for `PropDefinition`)

#### 3. Implementation Spec
- **Architecture**:
  - The `PropsEditor` will preprocess the `inputProps` and `schema` to organize props into groups based on the `group` property in their definition.
  - A new internal `PropGroup` component will handle the collapsible UI section.
  - Props without a defined `group` will be rendered at the top level (or in a "General" group if mixed).
  - Persistence of expanded/collapsed state is not strictly required for MVP but good for UX (local state).
- **Pseudo-Code**:
  ```typescript
  // PropsEditor.tsx

  // Helper to group props
  const groupedProps = useMemo(() => {
    const groups: Record<string, string[]> = {};
    const ungrouped: string[] = [];

    // Iterate keys in order
    Object.keys(inputProps).forEach(key => {
      const def = schema?.[key];
      if (def?.group) {
        if (!groups[def.group]) groups[def.group] = [];
        groups[def.group].push(key);
      } else {
        ungrouped.push(key);
      }
    });

    return { groups, ungrouped };
  }, [inputProps, schema]);

  // Render
  return (
    <div className="props-editor">
      <Toolbar />
      {/* Render Ungrouped Props First */}
      {groupedProps.ungrouped.map(key => renderProp(key))}

      {/* Render Groups */}
      {Object.entries(groupedProps.groups).map(([groupName, keys]) => (
        <PropGroup key={groupName} title={groupName}>
           {keys.map(key => renderProp(key))}
        </PropGroup>
      ))}
    </div>
  )
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run existing tests to ensure no regressions: `npm test packages/studio/src/components/PropsEditor.test.tsx`.
  - Start Studio: `npx helios studio`.
  - Create/Open a composition with a schema that uses `group`.
  - Verify props are organized into collapsible headers matching the group names.
  - Verify props without groups appear at the top level.
  - Verify values can still be edited and "Reset" works.
- **Success Criteria**: UI displays props in groups as defined by the schema, and unit tests pass.
- **Edge Cases**:
  - Schema is undefined (all ungrouped).
  - Mixed grouped and ungrouped props.
  - Empty groups (shouldn't happen by logic).
  - Special characters in group names.
